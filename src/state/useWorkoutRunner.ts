import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  bestMark,
  discardSessionIfEmpty,
  finishSession,
  logSet,
  previousSets,
  sessionSets,
  startOrResumeSession,
  unlogSet,
} from '../db/sessions';
import type { BestMarkRow, LoggedSetRow } from '../db/types';
import { getWorkoutExercises } from '../db/workouts';

export const STEP_KG = 2.5;
const MIN_KG = 0;
const MIN_REPS = 1;

export type RunnerExercise = {
  id: string;
  name: string;
  targetSets: number;
  repMin: number;
  repMax: number;
};

export type RunnerSet = {
  kg: number;
  reps: number;
  done: boolean;
};

export type PersonalRecord = {
  exerciseName: string;
  kg: number;
  reps: number;
  previousKg: number;
  previousDay: string;
  gainPercent: number;
};

/** Séries iniciais: o que já foi gravado hoje, senão a última sessão, senão o alvo. */
function seedSets(
  exercise: RunnerExercise,
  logged: LoggedSetRow[],
  previous: LoggedSetRow[]
): RunnerSet[] {
  if (logged.length > 0) {
    const fromLog = [...logged]
      .sort((a, b) => a.set_index - b.set_index)
      .map((s) => ({ kg: s.kg, reps: s.reps, done: true }));
    // Séries do plano que ainda não foram feitas continuam abertas embaixo.
    const missing = Math.max(0, exercise.targetSets - fromLog.length);
    const base = previous[fromLog.length] ?? previous[previous.length - 1];
    return [
      ...fromLog,
      ...Array.from({ length: missing }, () => ({
        kg: base?.kg ?? 0,
        reps: base?.reps ?? exercise.repMin,
        done: false,
      })),
    ];
  }

  if (previous.length > 0) {
    return previous.map((s) => ({ kg: s.kg, reps: s.reps, done: false }));
  }

  return Array.from({ length: exercise.targetSets }, () => ({
    kg: 0,
    reps: exercise.repMin,
    done: false,
  }));
}

/**
 * Roda uma sessão de treino contra o banco.
 *
 * Cada série concluída vira uma linha em `session_sets` na hora — é esse
 * registro que alimenta "Semana passada", a melhor marca, o calendário e o
 * progresso. Desmarcar apaga a linha.
 */
export function useWorkoutRunner(workoutId: string, restSeconds: number) {
  const [exercises, setExercises] = useState<RunnerExercise[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [exIdx, setExIdx] = useState(0);
  const [setsByExercise, setSetsByExercise] = useState<Record<string, RunnerSet[]>>({});
  const [reference, setReference] = useState<LoggedSetRow[]>([]);
  const [best, setBest] = useState<BestMarkRow | null>(null);
  const [loading, setLoading] = useState(true);

  const [resting, setResting] = useState(false);
  const [record, setRecord] = useState<PersonalRecord | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);

  /** Séries já gravadas na sessão, por exercício — usado ao trocar de exercício. */
  const loggedRef = useRef<Record<string, LoggedSetRow[]>>({});

  useEffect(() => {
    let alive = true;

    (async () => {
      const [rows, session] = await Promise.all([
        getWorkoutExercises(workoutId),
        startOrResumeSession(workoutId),
      ]);
      const logged = await sessionSets(session.id);
      if (!alive) return;

      const list: RunnerExercise[] = rows.map((row) => ({
        id: row.exercise_id,
        name: row.name,
        targetSets: row.target_sets,
        repMin: row.rep_min,
        repMax: row.rep_max,
      }));

      loggedRef.current = logged;
      setExercises(list);
      setSessionId(session.id);
      setStartedAt(session.started_at);
      // Retoma no primeiro exercício ainda sem série gravada.
      const resumeAt = list.findIndex((e) => (logged[e.id]?.length ?? 0) === 0);
      setExIdx(resumeAt === -1 ? 0 : resumeAt);
      setLoading(false);
    })().catch((error) => console.error('Falha ao abrir a sessão', error));

    return () => {
      alive = false;
    };
  }, [workoutId]);

  const exercise = exercises[exIdx] ?? null;

  /** Ao entrar num exercício, busca a referência e monta as séries dele. */
  useEffect(() => {
    if (!exercise || !sessionId) return;
    let alive = true;

    (async () => {
      const [previous, mark] = await Promise.all([
        previousSets(exercise.id, sessionId),
        bestMark(exercise.id),
      ]);
      if (!alive) return;

      setReference(previous);
      setBest(mark);
      setSetsByExercise((current) =>
        current[exercise.id]
          ? current
          : {
              ...current,
              [exercise.id]: seedSets(exercise, loggedRef.current[exercise.id] ?? [], previous),
            }
      );
    })().catch((error) => console.error('Falha ao carregar o exercício', error));

    return () => {
      alive = false;
    };
  }, [exercise, sessionId]);

  const sets = exercise ? (setsByExercise[exercise.id] ?? []) : [];

  const updateSets = useCallback((exerciseId: string, fn: (sets: RunnerSet[]) => RunnerSet[]) => {
    setSetsByExercise((current) => ({ ...current, [exerciseId]: fn(current[exerciseId] ?? []) }));
  }, []);

  const changeKg = useCallback(
    (index: number, direction: number) => {
      if (!exercise || !sessionId) return;
      updateSets(exercise.id, (list) =>
        list.map((s, i) => {
          if (i !== index) return s;
          const kg = Math.max(MIN_KG, s.kg + STEP_KG * Math.sign(direction));
          // Mexer numa série já concluída corrige o registro.
          if (s.done) void logSet(sessionId, exercise.id, i, kg, s.reps);
          return { ...s, kg };
        })
      );
    },
    [exercise, sessionId, updateSets]
  );

  const changeReps = useCallback(
    (index: number, direction: number) => {
      if (!exercise || !sessionId) return;
      updateSets(exercise.id, (list) =>
        list.map((s, i) => {
          if (i !== index) return s;
          const reps = Math.max(MIN_REPS, s.reps + Math.sign(direction));
          if (s.done) void logSet(sessionId, exercise.id, i, s.kg, reps);
          return { ...s, reps };
        })
      );
    },
    [exercise, sessionId, updateSets]
  );

  const toggleSet = useCallback(
    async (index: number) => {
      if (!exercise || !sessionId) return;
      const target = sets[index];
      if (!target) return;
      const turningOn = !target.done;

      updateSets(exercise.id, (list) =>
        list.map((s, i) => (i === index ? { ...s, done: turningOn } : s))
      );

      if (!turningOn) {
        await unlogSet(sessionId, exercise.id, index);
        loggedRef.current[exercise.id] = (loggedRef.current[exercise.id] ?? []).filter(
          (s) => s.set_index !== index
        );
        return;
      }

      await logSet(sessionId, exercise.id, index, target.kg, target.reps);
      loggedRef.current[exercise.id] = [
        ...(loggedRef.current[exercise.id] ?? []).filter((s) => s.set_index !== index),
        { set_index: index, kg: target.kg, reps: target.reps },
      ];

      // Recorde tem a vez antes do descanso; o descanso começa no "Continuar".
      const beatsBest =
        best && (target.kg > best.kg || (target.kg === best.kg && target.reps > best.reps));

      if (beatsBest && best) {
        setRecord({
          exerciseName: exercise.name,
          kg: target.kg,
          reps: target.reps,
          previousKg: best.kg,
          previousDay: best.day,
          gainPercent: Math.round(((target.kg - best.kg) / best.kg) * 100),
        });
      } else {
        setResting(true);
      }
    },
    [exercise, sessionId, sets, best, updateSets]
  );

  const addSet = useCallback(() => {
    if (!exercise) return;
    updateSets(exercise.id, (list) => {
      const heaviest = list.reduce((max, s) => Math.max(max, s.kg), 0);
      return [...list, { kg: heaviest, reps: exercise.repMin, done: false }];
    });
  }, [exercise, updateSets]);

  const goToExercise = useCallback(
    (index: number) => {
      if (index < 0 || index >= exercises.length) return;
      setExIdx(index);
    },
    [exercises.length]
  );

  const nextExercise = useCallback(
    () => goToExercise((exIdx + 1) % Math.max(1, exercises.length)),
    [goToExercise, exIdx, exercises.length]
  );

  const previousExercise = useCallback(() => goToExercise(exIdx - 1), [goToExercise, exIdx]);

  const dismissRecord = useCallback(() => {
    setRecord(null);
    setResting(true);
  }, []);

  const finish = useCallback(async () => {
    if (!sessionId) return false;
    return finishSession(sessionId);
  }, [sessionId]);

  const abandon = useCallback(async () => {
    if (!sessionId) return;
    await discardSessionIfEmpty(sessionId);
  }, [sessionId]);

  const elapsedSeconds = useMemo(() => {
    if (!startedAt) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  }, [startedAt]);

  const startRest = useCallback(() => setResting(true), []);
  const endRest = useCallback(() => setResting(false), []);
  const openNotes = useCallback(() => setNotesOpen(true), []);
  const closeNotes = useCallback(() => setNotesOpen(false), []);

  return {
    loading,
    exercises,
    exercise,
    exIdx,
    sets,
    reference,
    best,
    elapsedSeconds,
    restSeconds,
    resting,
    record,
    notesOpen,
    canGoBack: exIdx > 0,

    changeKg,
    changeReps,
    toggleSet,
    addSet,
    nextExercise,
    previousExercise,
    startRest,
    endRest,
    dismissRecord,
    openNotes,
    closeNotes,
    finish,
    abandon,
  };
}
