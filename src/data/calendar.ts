import type { Schedule } from '../db/schedule';
import { isoDay, mondayFirstWeekday, sundayFirstWeekday } from '../lib/date';

export type DayState = 'done' | 'today' | 'planned' | 'rest';

export type DayCell = {
  /** null nas casas vazias antes do dia 1. */
  day: number | null;
  iso: string;
  state: DayState;
};

export type CalendarMode = 'fixed' | 'seq';

/** Índice na agenda gravada (0 = segunda). */
export function weekdayOf(iso: string): number {
  return mondayFirstWeekday(new Date(`${iso}T00:00:00`));
}

/** No modo sequência não existe dia fixo de descanso: treina quando aparecer. */
export function isRestDay(iso: string, mode: CalendarMode, schedule: Schedule): boolean {
  if (mode === 'seq') return false;
  return schedule[weekdayOf(iso)] === undefined;
}

/**
 * Monta o mês. "Treinou" vem do banco (dias com sessão concluída); o resto sai
 * da agenda do usuário, então dashboard e calendário nunca se contradizem.
 */
export function buildMonth(
  year: number,
  month: number,
  trained: Set<string>,
  mode: CalendarMode,
  schedule: Schedule
): DayCell[] {
  const lead = sundayFirstWeekday(new Date(year, month, 1));
  const length = new Date(year, month + 1, 0).getDate();
  const today = isoDay(new Date());

  const cells: DayCell[] = Array.from({ length: lead }, () => ({
    day: null,
    iso: '',
    state: 'rest' as DayState,
  }));

  for (let day = 1; day <= length; day++) {
    const iso = isoDay(new Date(year, month, day));

    let state: DayState;
    if (trained.has(iso)) state = 'done';
    else if (iso === today) state = 'today';
    else if (isRestDay(iso, mode, schedule)) state = 'rest';
    else state = iso < today ? 'rest' : 'planned';

    cells.push({ day, iso, state });
  }

  return cells;
}

/**
 * Qual treino cai no dia.
 * `fixed`: a agenda que o usuário montou manda.
 * `seq`: a ordem dos treinos avança a cada dia treinado, não importa o dia.
 */
export function workoutIdOfDay(
  iso: string,
  mode: CalendarMode,
  schedule: Schedule,
  workoutIds: string[],
  trainedBefore: number
): string | null {
  if (workoutIds.length === 0) return null;
  if (mode === 'seq') return workoutIds[trainedBefore % workoutIds.length];
  return schedule[weekdayOf(iso)] ?? null;
}

export const seqHint = 'Os treinos seguem a ordem da sua lista no dia em que você aparecer.';
