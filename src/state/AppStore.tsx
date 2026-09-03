import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { CalendarMode } from '../data/calendar';
import { type Settings, loadSettings, saveSetting } from '../db/settings';
import {
  createWorkout,
  deleteWorkout as deleteWorkoutRow,
  duplicateWorkout as duplicateWorkoutRow,
  getWorkoutExercises,
  listWorkouts,
  updateWorkout,
} from '../db/workouts';
import type { ExerciseRow, WorkoutRow } from '../db/types';

/** Exercício dentro do treino em edição. */
export type DraftExercise = {
  exerciseId: string;
  name: string;
  sets: number;
  repMin: number;
  repMax: number;
  /** Última carga registrada, só para a linha de detalhe. */
  lastLoad: number | null;
};

type Draft = {
  /** null quando é um treino novo. */
  workoutId: string | null;
  name: string;
  exercises: DraftExercise[];
};

const EMPTY_DRAFT: Draft = { workoutId: null, name: '', exercises: [] };

type Store = {
  ready: boolean;
  workouts: WorkoutRow[];
  settings: Settings;
  draft: Draft;
  /** Sobe a cada gravação — as telas de leitura recarregam quando muda. */
  revision: number;

  refresh: () => Promise<void>;
  setMode: (mode: CalendarMode) => Promise<void>;

  newDraft: () => void;
  editDraft: (workout: WorkoutRow) => Promise<void>;
  renameDraft: (name: string) => void;
  addDraftExercise: (exercise: ExerciseRow) => void;
  removeDraftExercise: (index: number) => void;
  moveDraftExercise: (index: number, direction: -1 | 1) => void;
  saveDraft: () => Promise<void>;

  duplicateWorkout: (id: string) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
};

const FALLBACK_SETTINGS: Settings = {
  profileName: 'Você',
  goal: 'Hipertrofia',
  unit: 'kg',
  daysPerWeek: 5,
  calendarMode: 'fixed',
  restSeconds: 90,
  notifications: 'Ativas',
  accountEmail: '',
};

const AppContext = createContext<Store | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [settings, setSettings] = useState<Settings>(FALLBACK_SETTINGS);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [revision, setRevision] = useState(0);

  const refresh = useCallback(async () => {
    const [rows, loaded] = await Promise.all([listWorkouts(), loadSettings()]);
    setWorkouts(rows);
    setSettings(loaded);
    setRevision((r) => r + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    refresh()
      .catch((error) => console.error('Falha ao abrir o banco', error))
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [refresh]);

  const setMode = useCallback(async (mode: CalendarMode) => {
    setSettings((current) => ({ ...current, calendarMode: mode }));
    await saveSetting('calendarMode', mode);
  }, []);

  const newDraft = useCallback(() => setDraft(EMPTY_DRAFT), []);

  const editDraft = useCallback(async (workout: WorkoutRow) => {
    const rows = await getWorkoutExercises(workout.id);
    setDraft({
      workoutId: workout.id,
      name: workout.title,
      exercises: rows.map((row) => ({
        exerciseId: row.exercise_id,
        name: row.name,
        sets: row.target_sets,
        repMin: row.rep_min,
        repMax: row.rep_max,
        lastLoad: row.last_load,
      })),
    });
  }, []);

  const renameDraft = useCallback((name: string) => {
    setDraft((current) => ({ ...current, name }));
  }, []);

  const addDraftExercise = useCallback((exercise: ExerciseRow) => {
    setDraft((current) => ({
      ...current,
      exercises: [
        ...current.exercises,
        {
          exerciseId: exercise.id,
          name: exercise.name,
          sets: 3,
          repMin: 8,
          repMax: 10,
          lastLoad: null,
        },
      ],
    }));
  }, []);

  const removeDraftExercise = useCallback((index: number) => {
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.filter((_, i) => i !== index),
    }));
  }, []);

  const moveDraftExercise = useCallback((index: number, direction: -1 | 1) => {
    setDraft((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.exercises.length) return current;
      const exercises = [...current.exercises];
      [exercises[index], exercises[target]] = [exercises[target], exercises[index]];
      return { ...current, exercises };
    });
  }, []);

  const saveDraft = useCallback(async () => {
    const title = draft.name.trim() || 'Treino sem nome';
    const exercises = draft.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      sets: e.sets,
      repMin: e.repMin,
      repMax: e.repMax,
    }));

    if (draft.workoutId) {
      await updateWorkout(draft.workoutId, title, exercises);
    } else {
      await createWorkout(title, exercises);
    }
    await refresh();
  }, [draft, refresh]);

  const duplicateWorkout = useCallback(
    async (id: string) => {
      await duplicateWorkoutRow(id);
      await refresh();
    },
    [refresh]
  );

  const deleteWorkout = useCallback(
    async (id: string) => {
      await deleteWorkoutRow(id);
      await refresh();
    },
    [refresh]
  );

  const value = useMemo<Store>(
    () => ({
      ready,
      workouts,
      settings,
      draft,
      revision,
      refresh,
      setMode,
      newDraft,
      editDraft,
      renameDraft,
      addDraftExercise,
      removeDraftExercise,
      moveDraftExercise,
      saveDraft,
      duplicateWorkout,
      deleteWorkout,
    }),
    [
      ready,
      workouts,
      settings,
      draft,
      revision,
      refresh,
      setMode,
      newDraft,
      editDraft,
      renameDraft,
      addDraftExercise,
      removeDraftExercise,
      moveDraftExercise,
      saveDraft,
      duplicateWorkout,
      deleteWorkout,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): Store {
  const store = useContext(AppContext);
  if (!store) throw new Error('useApp precisa estar dentro de AppProvider');
  return store;
}
