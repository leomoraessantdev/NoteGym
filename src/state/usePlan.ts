import { useCallback } from 'react';
import { isRestDay, workoutOfDay } from '../data/calendar';
import type { WorkoutRow } from '../db/types';
import { isoDay } from '../lib/date';
import { useApp } from './AppStore';

export type PlannedDay = {
  iso: string;
  workout: WorkoutRow | null;
  isRest: boolean;
};

/**
 * Qual treino cai em cada dia. Início e Calendário passam por aqui, então os
 * dois nunca podem se contradizer.
 */
export function usePlan(trainedBefore: (iso: string) => number) {
  const { workouts, settings } = useApp();
  const titles = workouts.map((w) => w.title);

  const planFor = useCallback(
    (iso: string): PlannedDay => {
      if (isRestDay(iso) || workouts.length === 0) {
        return { iso, workout: null, isRest: true };
      }
      const title = workoutOfDay(iso, settings.calendarMode, titles, trainedBefore(iso));
      const workout = workouts.find((w) => w.title === title) ?? null;
      return { iso, workout, isRest: workout === null };
    },
    // titles deriva de workouts; manter workouts na lista basta
    [workouts, settings.calendarMode, trainedBefore] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const today = planFor(isoDay(new Date()));

  return { planFor, today };
}
