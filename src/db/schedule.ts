import { getDatabase } from './client';

/** weekday: 0 segunda ... 6 domingo. Ausente do mapa = dia de descanso. */
export type Schedule = Record<number, string>;

export const WEEKDAY_NAMES = [
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
  'Domingo',
];

export const WEEKDAY_SHORT = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

/** Ordem de exibição — domingo primeiro, como no calendário. */
export const WEEKDAY_DISPLAY_ORDER = [6, 0, 1, 2, 3, 4, 5];

export async function loadSchedule(): Promise<Schedule> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ weekday: number; workout_id: string }>(
    'SELECT weekday, workout_id FROM schedule'
  );
  return Object.fromEntries(rows.map((r) => [r.weekday, r.workout_id]));
}

/** `null` transforma o dia em descanso. */
export async function setScheduleDay(weekday: number, workoutId: string | null): Promise<void> {
  const db = await getDatabase();
  if (workoutId === null) {
    await db.runAsync('DELETE FROM schedule WHERE weekday = ?', [weekday]);
    return;
  }
  await db.runAsync(
    `INSERT INTO schedule (weekday, workout_id) VALUES (?, ?)
     ON CONFLICT (weekday) DO UPDATE SET workout_id = excluded.workout_id`,
    [weekday, workoutId]
  );
}

/** Frase do modo "dias fixos", montada a partir da agenda real do usuário. */
export function describeSchedule(schedule: Schedule): string {
  const training = WEEKDAY_DISPLAY_ORDER.filter((i) => schedule[i] !== undefined).map(
    (i) => WEEKDAY_SHORT[i]
  );
  const resting = WEEKDAY_DISPLAY_ORDER.filter((i) => schedule[i] === undefined).map(
    (i) => WEEKDAY_SHORT[i]
  );

  if (training.length === 0) {
    return 'Nenhum dia de treino definido ainda. Toque em Editar para montar a semana.';
  }
  if (resting.length === 0) return `Você treina todos os dias: ${training.join(', ')}.`;

  const list = (items: string[]) =>
    items.length === 1 ? items[0] : `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;

  const rest =
    resting.length === 1 ? `${list(resting)} é descanso.` : `${list(resting)} são descanso.`;

  return `Você treina ${list(training)}. ${rest}`;
}

/**
 * Ordem para tirar dias quando a meta diminui: começa pelos que menos costumam
 * ser dia de treino. Sair de 5 para 4 solta o sábado, não a segunda.
 */
const DROP_ORDER = [6, 5, 4, 3, 2, 1, 0];

/** Ordem para preencher quando a meta aumenta: dias úteis primeiro. */
const FILL_ORDER = [0, 1, 2, 3, 4, 5, 6];

/**
 * Ajusta a agenda para ter exatamente `targetDays` dias de treino.
 *
 * A meta semanal do perfil e as bolinhas do calendário são a mesma coisa vista
 * de dois jeitos — se divergirem, uma das telas está mentindo.
 */
export function resizeSchedule(
  current: Schedule,
  targetDays: number,
  workoutIds: string[]
): Schedule {
  if (workoutIds.length === 0) return current;

  const next: Schedule = { ...current };
  const training = () => Object.keys(next).length;

  for (const weekday of DROP_ORDER) {
    if (training() <= targetDays) break;
    if (next[weekday] !== undefined) delete next[weekday];
  }

  // Dia novo recebe o treino menos usado na semana, para não repetir o mesmo.
  for (const weekday of FILL_ORDER) {
    if (training() >= targetDays) break;
    if (next[weekday] !== undefined) continue;

    const usage = new Map(workoutIds.map((id) => [id, 0]));
    for (const id of Object.values(next)) {
      usage.set(id, (usage.get(id) ?? 0) + 1);
    }
    const leastUsed = workoutIds.reduce((best, id) =>
      (usage.get(id) ?? 0) < (usage.get(best) ?? 0) ? id : best
    );
    next[weekday] = leastUsed;
  }

  return next;
}

/**
 * Grava a semana inteira de uma vez.
 *
 * Numa transação só: sete gravações soltas podiam parar no meio e deixar meia
 * semana valendo — o calendário mostraria uma agenda que o usuário nunca pediu.
 */
export async function applySchedule(next: Schedule): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM schedule');
    for (let weekday = 0; weekday < 7; weekday++) {
      const workoutId = next[weekday];
      if (workoutId === undefined) continue;
      await db.runAsync('INSERT INTO schedule (weekday, workout_id) VALUES (?, ?)', [
        weekday,
        workoutId,
      ]);
    }
  });
}
