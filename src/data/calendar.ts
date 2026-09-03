import { isoDay, mondayFirstWeekday } from '../lib/date';

export type DayState = 'done' | 'today' | 'planned' | 'rest';

export type DayCell = {
  /** null nas casas vazias antes do dia 1. */
  day: number | null;
  iso: string;
  state: DayState;
};

export type CalendarMode = 'fixed' | 'seq';

/** Índices de dia da semana começando na segunda: 0 seg ... 6 dom. */
const REST_WEEKDAYS = [2, 6];

/**
 * Monta o mês. "Treinou" vem do banco (dias com sessão concluída); o resto é
 * derivado do calendário, então dashboard e calendário nunca se contradizem.
 */
export function buildMonth(year: number, month: number, trained: Set<string>): DayCell[] {
  const lead = mondayFirstWeekday(new Date(year, month, 1));
  const length = new Date(year, month + 1, 0).getDate();
  const today = isoDay(new Date());

  const cells: DayCell[] = Array.from({ length: lead }, () => ({
    day: null,
    iso: '',
    state: 'rest' as DayState,
  }));

  for (let day = 1; day <= length; day++) {
    const iso = isoDay(new Date(year, month, day));
    const weekday = mondayFirstWeekday(new Date(year, month, day));

    let state: DayState;
    if (trained.has(iso)) state = 'done';
    else if (iso === today) state = 'today';
    else if (REST_WEEKDAYS.includes(weekday)) state = 'rest';
    else state = iso < today ? 'rest' : 'planned';

    cells.push({ day, iso, state });
  }

  return cells;
}

export function isRestDay(iso: string): boolean {
  return REST_WEEKDAYS.includes(mondayFirstWeekday(new Date(`${iso}T00:00:00`)));
}

/**
 * Qual treino cai no dia.
 * `fixed`: a ordem se repete pelos dias da semana.
 * `seq`: a ordem A, B, C avança a cada dia treinado, não importa o dia.
 */
export function workoutOfDay(
  iso: string,
  mode: CalendarMode,
  titles: string[],
  trainedBefore: number
): string | null {
  if (titles.length === 0) return null;
  if (isRestDay(iso)) return null;

  if (mode === 'seq') return titles[trainedBefore % titles.length];

  const weekday = mondayFirstWeekday(new Date(`${iso}T00:00:00`));
  const slots = [0, 1, null, 2, 0, 1, null];
  const slot = slots[weekday];
  return slot === null ? null : titles[slot % titles.length];
}

export const modeHint: Record<CalendarMode, string> = {
  fixed: 'Você treina seg, ter, qui, sex e sáb. Quarta e domingo são descanso.',
  seq: 'Os treinos seguem a ordem A, B, C no dia em que você aparecer.',
};
