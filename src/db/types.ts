/** Formas que saem do banco. Datas sempre ISO: 'YYYY-MM-DD' ou ISO completo. */

export type ExerciseRow = {
  id: string;
  name: string;
  muscle_group: string;
  /** 1 quando o próprio usuário nomeou o exercício. */
  is_custom: number;
};

export type WorkoutRow = {
  id: string;
  letter: string;
  title: string;
  position: number;
  exercise_count: number;
  last_done: string | null;
};

export type WorkoutExerciseRow = {
  exercise_id: string;
  name: string;
  target_sets: number;
  rep_min: number;
  rep_max: number;
  position: number;
  /** Maior carga da última sessão concluída deste exercício. */
  last_load: number | null;
};

export type SessionRow = {
  id: string;
  workout_id: string | null;
  day: string;
  started_at: string;
  finished_at: string | null;
};

export type SessionSetRow = {
  session_id: string;
  exercise_id: string;
  set_index: number;
  kg: number;
  reps: number;
};

export type LoggedSetRow = {
  kg: number;
  reps: number;
  set_index: number;
};

export type ExerciseSessionRow = {
  session_id: string;
  day: string;
  sets: LoggedSetRow[];
};

export type BestMarkRow = {
  kg: number;
  reps: number;
  day: string;
};
