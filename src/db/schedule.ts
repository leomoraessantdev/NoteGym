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
