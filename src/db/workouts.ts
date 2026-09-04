import { newId } from '../lib/id';
import { getDatabase } from './client';
import type { ExerciseRow, WorkoutExerciseRow, WorkoutRow } from './types';

export type WorkoutDraftExercise = {
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
};

/** Treinos com a contagem de exercícios e a última vez que foram feitos. */
export async function listWorkouts(): Promise<WorkoutRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<WorkoutRow>(`
    SELECT
      w.id,
      w.letter,
      w.title,
      w.position,
      (SELECT COUNT(*) FROM workout_exercises we WHERE we.workout_id = w.id) AS exercise_count,
      (SELECT MAX(s.day) FROM sessions s
         WHERE s.workout_id = w.id AND s.finished_at IS NOT NULL) AS last_done
    FROM workouts w
    ORDER BY w.position
  `);
}

export async function getWorkout(id: string): Promise<WorkoutRow | null> {
  const db = await getDatabase();
  return db.getFirstAsync<WorkoutRow>(
    `SELECT
       w.id, w.letter, w.title, w.position,
       (SELECT COUNT(*) FROM workout_exercises we WHERE we.workout_id = w.id) AS exercise_count,
       (SELECT MAX(s.day) FROM sessions s
          WHERE s.workout_id = w.id AND s.finished_at IS NOT NULL) AS last_done
     FROM workouts w WHERE w.id = ?`,
    [id]
  );
}

export async function getWorkoutExercises(workoutId: string): Promise<WorkoutExerciseRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<WorkoutExerciseRow>(
    `SELECT
       we.exercise_id, e.name, we.target_sets, we.rep_min, we.rep_max, we.position,
       (SELECT ss.kg
          FROM session_sets ss
          JOIN sessions s ON s.id = ss.session_id
          WHERE ss.exercise_id = we.exercise_id AND s.finished_at IS NOT NULL
          ORDER BY s.started_at DESC, ss.kg DESC
          LIMIT 1) AS last_load
     FROM workout_exercises we
     JOIN exercises e ON e.id = we.exercise_id
     WHERE we.workout_id = ?
     ORDER BY we.position`,
    [workoutId]
  );
}

export async function listExercises(query = ''): Promise<ExerciseRow[]> {
  const db = await getDatabase();
  const term = `%${query.trim().toLowerCase()}%`;
  // Os que o usuário criou vêm primeiro: são os que ele procura de novo.
  if (!query.trim()) {
    return db.getAllAsync<ExerciseRow>(
      'SELECT * FROM exercises ORDER BY is_custom DESC, muscle_group, name'
    );
  }
  return db.getAllAsync<ExerciseRow>(
    `SELECT * FROM exercises
     WHERE lower(name) LIKE ? OR lower(muscle_group) LIKE ?
     ORDER BY is_custom DESC, muscle_group, name`,
    [term, term]
  );
}

/** Grupos disponíveis, para o usuário escolher ao criar um exercício. */
export async function listMuscleGroups(): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ muscle_group: string }>(
    'SELECT DISTINCT muscle_group FROM exercises ORDER BY muscle_group'
  );
  return rows.map((r) => r.muscle_group);
}

/** Existe exercício com esse nome? Evita duplicata ao criar um novo. */
export async function findExerciseByName(name: string): Promise<ExerciseRow | null> {
  const db = await getDatabase();
  return db.getFirstAsync<ExerciseRow>(
    'SELECT * FROM exercises WHERE lower(name) = lower(?) LIMIT 1',
    [name.trim()]
  );
}

/**
 * Cria um exercício com o nome que o usuário quiser. Se já existir um com o
 * mesmo nome, devolve o que existe em vez de duplicar.
 */
export async function createExercise(name: string, group: string): Promise<ExerciseRow> {
  const clean = name.trim();
  const existing = await findExerciseByName(clean);
  if (existing) return existing;

  const db = await getDatabase();
  const id = newId('custom');
  await db.runAsync(
    'INSERT INTO exercises (id, name, muscle_group, is_custom) VALUES (?, ?, ?, 1)',
    [id, clean, group]
  );
  return { id, name: clean, muscle_group: group, is_custom: 1 };
}

/** Primeira letra livre: A, B, C, ... */
async function nextLetter(): Promise<string> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ letter: string }>('SELECT letter FROM workouts');
  const used = new Set(rows.map((r) => r.letter));
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i);
    if (!used.has(letter)) return letter;
  }
  return '?';
}

async function nextPosition(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ next: number }>(
    'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM workouts'
  );
  return row?.next ?? 0;
}

/**
 * Troca a lista de exercícios do treino.
 *
 * O mesmo exercício não pode entrar duas vezes: os dois cards na execução
 * gravariam na mesma chave (sessão, exercício, índice) e um apagaria o outro.
 * A repetição é descartada aqui, e o índice único no banco é a rede embaixo.
 */
async function replaceExercises(
  workoutId: string,
  exercises: WorkoutDraftExercise[]
): Promise<void> {
  const db = await getDatabase();
  const unique = exercises.filter(
    (exercise, index) => exercises.findIndex((e) => e.exerciseId === exercise.exerciseId) === index
  );

  await db.runAsync('DELETE FROM workout_exercises WHERE workout_id = ?', [workoutId]);
  for (const [position, exercise] of unique.entries()) {
    await db.runAsync(
      `INSERT INTO workout_exercises
         (workout_id, exercise_id, target_sets, rep_min, rep_max, position)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [workoutId, exercise.exerciseId, exercise.sets, exercise.repMin, exercise.repMax, position]
    );
  }
}

export async function createWorkout(
  title: string,
  exercises: WorkoutDraftExercise[]
): Promise<string> {
  const db = await getDatabase();
  const id = newId('w');
  const letter = await nextLetter();
  const position = await nextPosition();

  await db.withTransactionAsync(async () => {
    await db.runAsync('INSERT INTO workouts (id, letter, title, position) VALUES (?, ?, ?, ?)', [
      id,
      letter,
      title,
      position,
    ]);
    await replaceExercises(id, exercises);
  });

  return id;
}

export async function updateWorkout(
  id: string,
  title: string,
  exercises: WorkoutDraftExercise[]
): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE workouts SET title = ? WHERE id = ?', [title, id]);
    await replaceExercises(id, exercises);
  });
}

export async function deleteWorkout(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM workouts WHERE id = ?', [id]);
}

export async function duplicateWorkout(id: string): Promise<string | null> {
  const source = await getWorkout(id);
  if (!source) return null;
  const exercises = await getWorkoutExercises(id);
  return createWorkout(
    `${source.title} (cópia)`,
    exercises.map((e) => ({
      exerciseId: e.exercise_id,
      sets: e.target_sets,
      repMin: e.rep_min,
      repMax: e.rep_max,
    }))
  );
}
