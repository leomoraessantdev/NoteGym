import { useCallback } from 'react';
import { isRestDay, workoutIdOfDay } from '../data/calendar';
import type { WorkoutRow } from '../db/types';
import { isoDay } from '../lib/date';
import { useApp } from './AppStore';

export type PlannedDay = {
  iso: string;
  workout: WorkoutRow | null;
  isRest: boolean;
};

/**
 * Qual treino cai em cada dia, segundo a agenda do usuário. Início e Calendário
 * passam por aqui, então os dois nunca podem se contradizer.
 */
export function usePlan(trainedBefore: (iso: string) => number) {
  const { workouts, schedule, settings } = useApp();
  const mode = settings.calendarMode;

  const planFor = useCallback(
    (iso: string): PlannedDay => {
      if (workouts.length === 0 || isRestDay(iso, mode, schedule)) {
        return { iso, workout: null, isRest: true };
      }
      const id = workoutIdOfDay(
        iso,
        mode,
        schedule,
        workouts.map((w) => w.id),
        trainedBefore(iso)
      );
      const workout = workouts.find((w) => w.id === id) ?? null;
      return { iso, workout, isRest: workout === null };
    },
    [workouts, schedule, mode, trainedBefore]
  );

  return { planFor, today: planFor(isoDay(new Date())) };
}
