import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  bestMark,
  discardSession,
  discardSessionIfEmpty,
  finishSession,
  previousSets,
  rewriteExerciseSets,
  sessionSets,
  startOrResumeSession,
} from '../db/sessions';
import type { BestMarkRow, LoggedSetRow } from '../db/types';
import { getWorkoutExercises } from '../db/workouts';
import { isoDay } from '../lib/date';
import { tapConfirm, tapLight, tapSuccess } from '../lib/feedback';
import { stepWeight } from '../lib/units';

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
 * A projeção que o banco guarda: só as séries concluídas, na ordem da tela.
 *
 * O índice gravado é a posição entre as concluídas, nunca a posição na lista
 * visível. Assim marcar a série 3 antes da 1, ou apagar uma do meio, não deixa
 * a chave (sessão, exercício, índice) apontando para a série errada.
 */
function completedOf(sets: RunnerSet[]): { kg: number; reps: number }[] {
  return sets.filter((s) => s.done).map((s) => ({ kg: s.kg, reps: s.reps }));
}

function sameCompleted(
  a: { kg: number; reps: number }[],
  b: { kg: number; reps: number }[]
): boolean {
  return a.length === b.length && a.every((s, i) => s.kg === b[i].kg && s.reps === b[i].reps);
}

/** A maior das duas marcas: a carga manda, as repetições desempatam. */
function betterMark(a: BestMarkRow | null, b: BestMarkRow | null): BestMarkRow | null {
  if (!a) return b;
  if (!b) return a;
  return b.kg > a.kg || (b.kg === a.kg && b.reps > a.reps) ? b : a;
}

/**
 * Roda uma sessão de treino contra o banco.
 *
 * Toda mudança nas séries passa por `mutate`: ele atualiza a lista visível e
 * regrava as concluídas daquele exercício de uma vez só. Um caminho de escrita
 * único é o que garante que tela e banco não consigam discordar do que foi feito.
 */
export function useWorkoutRunner(workoutId: string, restSeconds: number, unit: string) {
  const [exercises, setExercises] = useState<RunnerExercise[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [exIdx, setExIdx] = useState(0);
  const [setsByExercise, setSetsByExercise] = useState<Record<string, RunnerSet[]>>({});
  const [reference, setReference] = useState<LoggedSetRow[]>([]);
  /** Dia da sessão de onde a referência veio. null na primeira vez. */
  const [referenceDay, setReferenceDay] = useState<string | null>(null);
  const [best, setBest] = useState<BestMarkRow | null>(null);
  const [loading, setLoading] = useState(true);
  /** Alguma gravação falhou: a tela precisa dizer, senão a série some calada. */
  const [saveFailed, setSaveFailed] = useState(false);

  const [resting, setResting] = useState(false);
  const [record, setRecord] = useState<PersonalRecord | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  /** Última série removida, para o "desfazer" logo depois da exclusão. */
  const [removed, setRemoved] = useState<{ index: number; set: RunnerSet } | null>(null);

  /** Espelho das séries: o que uma ação lê antes de calcular a lista seguinte. */
  const setsRef = useRef<Record<string, RunnerSet[]>>({});

  /** O que o banco já tinha quando a tela abriu — semeia exercícios não visitados. */
  const initialLogged = useRef<Record<string, LoggedSetRow[]>>({});

  /**
   * Melhor marca por exercício contando esta sessão. A consulta do banco só
   * enxerga sessões concluídas, então sem isto um recorde batido agora sumiria
   * ao voltar para o exercício e o aviso abriria de novo, com a marca vencida.
   */
  const bestByExercise = useRef<Record<string, BestMarkRow | null>>({});

  /** Gravações em fila: duas séries marcadas em sequência não disputam o banco. */
  const writes = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setsRef.current = {};
    initialLogged.current = {};
    bestByExercise.current = {};
    setSetsByExercise({});

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

      initialLogged.current = logged;
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

  /** Guarda a lista nova no espelho e na tela. Não toca no banco. */
  const putSets = useCallback((exerciseId: string, next: RunnerSet[]) => {
    setsRef.current = { ...setsRef.current, [exerciseId]: next };
    setSetsByExercise(setsRef.current);
  }, []);

  /** Ao entrar num exercício, busca a referência e monta as séries dele. */
  useEffect(() => {
    if (!exercise || !sessionId) return;
    let alive = true;
    const exerciseId = exercise.id;

    (async () => {
      const [previous, mark] = await Promise.all([
        previousSets(exerciseId, sessionId),
        bestMark(exerciseId),
      ]);
      if (!alive) return;

      const known = betterMark(bestByExercise.current[exerciseId] ?? null, mark);
      bestByExercise.current[exerciseId] = known;

      setReference(previous.sets);
      setReferenceDay(previous.day);
      setBest(known);
      if (!setsRef.current[exerciseId]) {
        putSets(
          exerciseId,
          seedSets(exercise, initialLogged.current[exerciseId] ?? [], previous.sets)
        );
      }
    })().catch((error) => console.error('Falha ao carregar o exercício', error));

    return () => {
      alive = false;
    };
  }, [exercise, sessionId, putSets]);

  const sets = exercise ? (setsByExercise[exercise.id] ?? []) : [];

  /**
   * Caminho único de mudança: calcula a lista nova, mostra, e regrava as séries
   * concluídas se elas mudaram. Mexer numa série ainda aberta não vai ao banco.
   */
  const mutate = useCallback(
    (fn: (list: RunnerSet[]) => RunnerSet[]) => {
      const exerciseId = exercise?.id;
      if (!exerciseId || !sessionId) return;

      const current = setsRef.current[exerciseId] ?? [];
      const next = fn(current);
      if (next === current) return;

      putSets(exerciseId, next);

      const after = completedOf(next);
      if (sameCompleted(completedOf(current), after)) return;

      writes.current = writes.current
        .then(() => rewriteExerciseSets(sessionId, exerciseId, after))
        .then(() => setSaveFailed(false))
        .catch((error) => {
          console.error('Falha ao gravar as séries', error);
          setSaveFailed(true);
        });
    },
    [exercise, sessionId, putSets]
  );

  const changeKg = useCallback(
    (index: number, direction: number) => {
      mutate((list) =>
        list.map((s, i) => (i === index ? { ...s, kg: stepWeight(s.kg, direction, unit) } : s))
      );
    },
    [mutate, unit]
  );

  const changeReps = useCallback(
    (index: number, direction: number) => {
      mutate((list) =>
        list.map((s, i) =>
          i === index ? { ...s, reps: Math.max(MIN_REPS, s.reps + Math.sign(direction)) } : s
        )
      );
    },
    [mutate]
  );

  const toggleSet = useCallback(
    (index: number) => {
      if (!exercise) return;
      const target = setsRef.current[exercise.id]?.[index];
      if (!target) return;
      const turningOn = !target.done;

      mutate((list) => list.map((s, i) => (i === index ? { ...s, done: turningOn } : s)));

      if (!turningOn) {
        tapLight();
        return;
      }
      tapConfirm();

      // Recorde tem a vez antes do descanso; o descanso começa no "Continuar".
      const beatsBest =
        best !== null && (target.kg > best.kg || (target.kg === best.kg && target.reps > best.reps));

      if (beatsBest && best) {
        tapSuccess();
        setRecord({
          exerciseName: exercise.name,
          kg: target.kg,
          reps: target.reps,
          previousKg: best.kg,
          previousDay: best.day,
          gainPercent: Math.round(((target.kg - best.kg) / best.kg) * 100),
        });

        const mark: BestMarkRow = { kg: target.kg, reps: target.reps, day: isoDay(new Date()) };
        bestByExercise.current[exercise.id] = mark;
        setBest(mark);
        return;
      }

      setResting(true);
    },
    [exercise, best, mutate]
  );

  const addSet = useCallback(() => {
    if (!exercise) return;
    const repMin = exercise.repMin;
    mutate((list) => [
      ...list,
      { kg: list.reduce((max, s) => Math.max(max, s.kg), 0), reps: repMin, done: false },
    ]);
  }, [exercise, mutate]);

  /** Remove uma série. As de baixo sobem, na tela e no banco. */
  const removeSet = useCallback(
    (index: number) => {
      if (!exercise) return;
      const current = setsRef.current[exercise.id] ?? [];
      // A última série não sai: o exercício ficaria sem nenhuma.
      if (current.length <= 1 || !current[index]) return;

      tapLight();
      setRemoved({ index, set: current[index] });
      mutate((list) => list.filter((_, i) => i !== index));
    },
    [exercise, mutate]
  );

  /** Devolve a série removida à posição de onde saiu. */
  const undoRemoveSet = useCallback(() => {
    if (!removed) return;
    const { index, set } = removed;
    setRemoved(null);
    mutate((list) => {
      const restored = [...list];
      restored.splice(Math.min(index, restored.length), 0, set);
      return restored;
    });
  }, [removed, mutate]);

  const dismissUndo = useCallback(() => setRemoved(null), []);

  const goToExercise = useCallback(
    (index: number) => {
      if (index < 0 || index >= exercises.length) return;
      setRemoved(null);
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

  /**
   * Séries já gravadas nesta sessão, somando os exercícios. Sai do estado, não
   * de uma referência: é este número que decide se sair pede confirmação.
   */
  const loggedTotal = useMemo(
    () =>
      exercises.reduce((total, item) => {
        const live = setsByExercise[item.id];
        if (live) return total + live.filter((s) => s.done).length;
        return total + (initialLogged.current[item.id]?.length ?? 0);
      }, 0),
    [exercises, setsByExercise]
  );

  /** Espera a fila de gravação: a última série marcada precisa estar no banco. */
  const flush = useCallback(() => writes.current.catch(() => undefined), []);

  const finish = useCallback(async () => {
    if (!sessionId) return false;
    await flush();
    return finishSession(sessionId);
  }, [sessionId, flush]);

  const discard = useCallback(async () => {
    if (!sessionId) return;
    await flush();
    await discardSession(sessionId);
  }, [sessionId, flush]);

  const abandon = useCallback(async () => {
    if (!sessionId) return;
    await flush();
    await discardSessionIfEmpty(sessionId);
  }, [sessionId, flush]);

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
    referenceDay,
    best,
    elapsedSeconds,
    restSeconds,
    resting,
    record,
    notesOpen,
    saveFailed,
    canGoBack: exIdx > 0,

    changeKg,
    changeReps,
    toggleSet,
    addSet,
    removeSet,
    removed,
    undoRemoveSet,
    dismissUndo,
    nextExercise,
    previousExercise,
    startRest,
    endRest,
    dismissRecord,
    openNotes,
    closeNotes,
    finish,
    abandon,
    discard,
    loggedTotal,
  };
}

/**
 * O que a tela e a mini-barra recebem. Sai da própria função, então não pode
 * divergir do que ela devolve.
 */
export type WorkoutRunner = ReturnType<typeof useWorkoutRunner>;
