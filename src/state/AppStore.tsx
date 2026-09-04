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
import {
  type Schedule,
  applySchedule,
  loadSchedule,
  resizeSchedule,
  setScheduleDay as setScheduleDayRow,
} from '../db/schedule';
import { type Settings, loadSettings, saveSetting } from '../db/settings';
import {
  createWorkout,
  deleteWorkout as deleteWorkoutRow,
  duplicateWorkout as duplicateWorkoutRow,
  getWorkoutExercises,
  listWorkouts,
  updateWorkout,
} from '../db/workouts';
import { closeSessionsFromPreviousDays, getOpenSession } from '../db/sessions';
import type { ExerciseRow, OpenSessionRow, WorkoutRow } from '../db/types';

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

/** Alvos que o usuário ajusta por exercício, no editor do treino. */
export type DraftTargets = {
  sets: number;
  repMin: number;
  repMax: number;
};

const TARGET_LIMITS = { sets: [1, 10], reps: [1, 50] } as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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
  /** Agenda semanal do modo "dias fixos". */
  schedule: Schedule;
  /** Treino começado e não finalizado, para a faixa de retomar. */
  openSession: OpenSessionRow | null;
  draft: Draft;
  /** Sobe a cada gravação — as telas de leitura recarregam quando muda. */
  revision: number;

  refresh: () => Promise<void>;
  setMode: (mode: CalendarMode) => Promise<void>;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;
  setScheduleDay: (weekday: number, workoutId: string | null) => Promise<void>;
  /** Muda a meta semanal e a agenda junto — as duas são a mesma informação. */
  setWeeklyTarget: (days: number) => Promise<void>;

  newDraft: () => void;
  editDraft: (workout: WorkoutRow) => Promise<void>;
  renameDraft: (name: string) => void;
  addDraftExercise: (exercise: ExerciseRow) => void;
  removeDraftExercise: (index: number) => void;
  /** Séries e faixa de repetições de um exercício do rascunho. */
  updateDraftExercise: (index: number, targets: DraftTargets) => void;
  moveDraftExercise: (index: number, direction: -1 | 1) => void;
  /** Arrastar solta o exercício em qualquer posição, não só na vizinha. */
  reorderDraftExercise: (from: number, to: number) => void;
  saveDraft: () => Promise<void>;

  duplicateWorkout: (id: string) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
  /** Cria um treino só com nome — os exercícios entram depois. */
  createNamedWorkout: (title: string) => Promise<string>;
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
  const [schedule, setSchedule] = useState<Schedule>({});
  const [openSession, setOpenSession] = useState<OpenSessionRow | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [revision, setRevision] = useState(0);

  const refresh = useCallback(async () => {
    // Antes de ler: o treino que ficou aberto ontem já acabou, mesmo que o app
    // nunca tenha visto o "Finalizar".
    await closeSessionsFromPreviousDays();

    const [rows, loaded, week, open] = await Promise.all([
      listWorkouts(),
      loadSettings(),
      loadSchedule(),
      getOpenSession(),
    ]);
    setWorkouts(rows);
    setSettings(loaded);
    setSchedule(week);
    setOpenSession(open);
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

  /** Grava a configuração e já reflete na tela, sem esperar o banco. */
  const updateSetting = useCallback(
    async <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((current) => ({ ...current, [key]: value }));
      await saveSetting(key, value);
      setRevision((r) => r + 1);
    },
    []
  );

  const setMode = useCallback(
    (mode: CalendarMode) => updateSetting('calendarMode', mode),
    [updateSetting]
  );

  /**
   * Mexer num dia muda quantos dias de treino a semana tem, então a meta do
   * perfil acompanha. Sem isso o perfil diria 5 com o calendário mostrando 4.
   */
  const setScheduleDay = useCallback(
    async (weekday: number, workoutId: string | null) => {
      const next = { ...schedule };
      if (workoutId === null) delete next[weekday];
      else next[weekday] = workoutId;

      setSchedule(next);
      await setScheduleDayRow(weekday, workoutId);

      const days = Object.keys(next).length;
      setSettings((current) => ({ ...current, daysPerWeek: days }));
      await saveSetting('daysPerWeek', days);
      setRevision((r) => r + 1);
    },
    [schedule]
  );

  const setWeeklyTarget = useCallback(
    async (days: number) => {
      const next = resizeSchedule(
        schedule,
        days,
        workouts.map((w) => w.id)
      );
      setSchedule(next);
      setSettings((current) => ({ ...current, daysPerWeek: days }));
      await applySchedule(next);
      await saveSetting('daysPerWeek', days);
      setRevision((r) => r + 1);
    },
    [schedule, workouts]
  );

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

  /**
   * O mesmo exercício não entra duas vezes no treino: na execução seriam dois
   * cards gravando na mesma linha de série, um apagando o outro.
   */
  const addDraftExercise = useCallback((exercise: ExerciseRow) => {
    setDraft((current) => {
      if (current.exercises.some((e) => e.exerciseId === exercise.id)) return current;
      return {
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
      };
    });
  }, []);

  const removeDraftExercise = useCallback((index: number) => {
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.filter((_, i) => i !== index),
    }));
  }, []);

  /**
   * O mínimo nunca passa o máximo: a faixa "10–8" não quer dizer nada, e é ela
   * que a sugestão de progressão lê para saber quando subir a carga.
   */
  const updateDraftExercise = useCallback((index: number, targets: DraftTargets) => {
    setDraft((current) => {
      if (!current.exercises[index]) return current;

      const sets = clamp(targets.sets, ...TARGET_LIMITS.sets);
      const repMin = clamp(targets.repMin, ...TARGET_LIMITS.reps);
      const repMax = clamp(Math.max(targets.repMax, repMin), ...TARGET_LIMITS.reps);

      return {
        ...current,
        exercises: current.exercises.map((exercise, i) =>
          i === index ? { ...exercise, sets, repMin, repMax } : exercise
        ),
      };
    });
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

  const reorderDraftExercise = useCallback((from: number, to: number) => {
    setDraft((current) => {
      const exercises = [...current.exercises];
      if (from < 0 || from >= exercises.length || to < 0 || to >= exercises.length) return current;
      const [moved] = exercises.splice(from, 1);
      exercises.splice(to, 0, moved);
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

  const createNamedWorkout = useCallback(
    async (title: string) => {
      const id = await createWorkout(title.trim() || 'Treino sem nome', []);
      await refresh();
      return id;
    },
    [refresh]
  );

  const duplicateWorkout = useCallback(
    async (id: string) => {
      await duplicateWorkoutRow(id);
      await refresh();
    },
    [refresh]
  );

  /**
   * Excluir tira o treino da agenda junto (cascade no banco). A meta semanal é
   * a mesma informação vista de outro jeito, então desce com ela — senão o
   * perfil diria 5 com o calendário mostrando 3.
   */
  const deleteWorkout = useCallback(
    async (id: string) => {
      await deleteWorkoutRow(id);
      const week = await loadSchedule();
      await saveSetting('daysPerWeek', Object.keys(week).length);
      await refresh();
    },
    [refresh]
  );

  const value = useMemo<Store>(
    () => ({
      ready,
      workouts,
      settings,
      schedule,
      openSession,
      draft,
      revision,
      refresh,
      setMode,
      updateSetting,
      setScheduleDay,
      setWeeklyTarget,
      newDraft,
      editDraft,
      renameDraft,
      addDraftExercise,
      removeDraftExercise,
      updateDraftExercise,
      moveDraftExercise,
      reorderDraftExercise,
      saveDraft,
      duplicateWorkout,
      deleteWorkout,
      createNamedWorkout,
    }),
    [
      ready,
      workouts,
      settings,
      schedule,
      openSession,
      draft,
      revision,
      refresh,
      setMode,
      updateSetting,
      setScheduleDay,
      setWeeklyTarget,
      newDraft,
      editDraft,
      renameDraft,
      addDraftExercise,
      removeDraftExercise,
      updateDraftExercise,
      moveDraftExercise,
      reorderDraftExercise,
      saveDraft,
      duplicateWorkout,
      deleteWorkout,
      createNamedWorkout,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): Store {
  const store = useContext(AppContext);
  if (!store) throw new Error('useApp precisa estar dentro de AppProvider');
  return store;
}
