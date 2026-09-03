import type { SQLiteDatabase } from 'expo-sqlite';
import { isoDay, shiftDays } from '../lib/date';

/**
 * Conteúdo do primeiro uso. Só roda com o banco vazio — depois disso o app
 * vive do que o usuário grava.
 *
 * A biblioteca começa com a lista do handoff mais os exercícios necessários
 * para montar os três treinos de exemplo.
 */
const EXERCISES: [id: string, name: string, group: string][] = [
  ['supino-reto', 'Supino reto', 'Peito'],
  ['supino-inclinado', 'Supino inclinado', 'Peito'],
  ['crucifixo', 'Crucifixo', 'Peito'],
  ['triceps-testa', 'Tríceps testa', 'Braços'],
  ['triceps-corda', 'Tríceps corda', 'Braços'],
  ['rosca-direta', 'Rosca direta', 'Braços'],
  ['rosca-martelo', 'Rosca martelo', 'Braços'],
  ['agachamento', 'Agachamento', 'Pernas'],
  ['leg-press', 'Leg press', 'Pernas'],
  ['cadeira-extensora', 'Cadeira extensora', 'Pernas'],
  ['mesa-flexora', 'Mesa flexora', 'Pernas'],
  ['stiff', 'Stiff', 'Pernas'],
  ['panturrilha', 'Panturrilha em pé', 'Pernas'],
  ['remada-curvada', 'Remada curvada', 'Costas'],
  ['remada-unilateral', 'Remada unilateral', 'Costas'],
  ['puxada-alta', 'Puxada alta', 'Costas'],
  ['desenvolvimento', 'Desenvolvimento', 'Ombros'],
  ['elevacao-lateral', 'Elevação lateral', 'Ombros'],
];

type SeedExercise = [exerciseId: string, sets: number, repMin: number, repMax: number];

const WORKOUTS: {
  id: string;
  letter: string;
  title: string;
  exercises: SeedExercise[];
}[] = [
  {
    id: 'w-a',
    letter: 'A',
    title: 'Peito e tríceps',
    exercises: [
      ['supino-reto', 3, 8, 10],
      ['supino-inclinado', 3, 8, 12],
      ['crucifixo', 3, 10, 15],
      ['triceps-testa', 3, 10, 12],
      ['triceps-corda', 3, 12, 15],
    ],
  },
  {
    id: 'w-b',
    letter: 'B',
    title: 'Costas e bíceps',
    exercises: [
      ['puxada-alta', 3, 8, 12],
      ['remada-curvada', 3, 8, 10],
      ['remada-unilateral', 3, 10, 12],
      ['rosca-direta', 3, 10, 12],
      ['rosca-martelo', 3, 10, 12],
    ],
  },
  {
    id: 'w-c',
    letter: 'C',
    title: 'Pernas',
    exercises: [
      ['agachamento', 4, 6, 10],
      ['leg-press', 3, 10, 12],
      ['cadeira-extensora', 3, 12, 15],
      ['mesa-flexora', 3, 12, 15],
      ['stiff', 3, 10, 12],
      ['panturrilha', 4, 12, 20],
    ],
  },
];

/**
 * Quatro sessões passadas do treino A. As cargas do supino reto são as do
 * handoff — é o que alimenta "Semana passada", a melhor marca e as anotações.
 */
const PAST_SESSIONS: { daysAgo: number; sets: Record<string, [kg: number, reps: number][]> }[] = [
  {
    daysAgo: 26,
    sets: {
      'supino-reto': [[28, 10], [30, 10], [32, 8]],
      'supino-inclinado': [[22, 12], [24, 10], [26, 8]],
      crucifixo: [[10, 15], [12, 12], [12, 10]],
      'triceps-testa': [[18, 12], [20, 10], [20, 10]],
      'triceps-corda': [[20, 15], [22, 13], [22, 12]],
    },
  },
  {
    daysAgo: 19,
    sets: {
      'supino-reto': [[28, 12], [32, 10], [35, 8]],
      'supino-inclinado': [[24, 12], [26, 10], [28, 8]],
      crucifixo: [[12, 15], [12, 13], [14, 10]],
      'triceps-testa': [[20, 12], [20, 11], [22.5, 10]],
      'triceps-corda': [[22, 15], [22, 14], [24, 12]],
    },
  },
  {
    daysAgo: 12,
    sets: {
      'supino-reto': [[30, 12], [35, 11], [40, 10]],
      'supino-inclinado': [[24, 12], [26, 11], [28, 10]],
      crucifixo: [[12, 15], [14, 13], [14, 12]],
      'triceps-testa': [[20, 12], [22.5, 11], [22.5, 10]],
      'triceps-corda': [[22, 15], [24, 14], [24, 13]],
    },
  },
  {
    daysAgo: 7,
    sets: {
      'supino-reto': [[30, 12], [35, 10], [38, 8]],
      'supino-inclinado': [[26, 12], [28, 10], [28, 9]],
      crucifixo: [[12, 15], [14, 14], [14, 12]],
      'triceps-testa': [[22.5, 12], [22.5, 11], [25, 9]],
      'triceps-corda': [[24, 15], [24, 14], [26, 12]],
    },
  },
];

const DEFAULT_SETTINGS: [key: string, value: string][] = [
  ['profile_name', 'Leonardo'],
  ['goal', 'Hipertrofia'],
  ['unit', 'kg'],
  ['days_per_week', '5'],
  ['calendar_mode', 'fixed'],
  ['rest_seconds', '90'],
  ['notifications', 'Ativas'],
  ['account_email', 'leonardo@notegym.app'],
];

export async function seedIfEmpty(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM exercises');
  if ((row?.count ?? 0) > 0) return;

  await db.withTransactionAsync(async () => {
    for (const [id, name, group] of EXERCISES) {
      await db.runAsync('INSERT INTO exercises (id, name, muscle_group) VALUES (?, ?, ?)', [
        id,
        name,
        group,
      ]);
    }

    for (const [index, workout] of WORKOUTS.entries()) {
      await db.runAsync(
        'INSERT INTO workouts (id, letter, title, position) VALUES (?, ?, ?, ?)',
        [workout.id, workout.letter, workout.title, index]
      );
      for (const [position, [exerciseId, sets, repMin, repMax]] of workout.exercises.entries()) {
        await db.runAsync(
          `INSERT INTO workout_exercises
             (workout_id, exercise_id, target_sets, rep_min, rep_max, position)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [workout.id, exerciseId, sets, repMin, repMax, position]
        );
      }
    }

    for (const session of PAST_SESSIONS) {
      const day = isoDay(shiftDays(new Date(), -session.daysAgo));
      const sessionId = `seed-${session.daysAgo}`;
      const startedAt = `${day}T19:00:00.000Z`;
      await db.runAsync(
        `INSERT INTO sessions (id, workout_id, day, started_at, finished_at)
         VALUES (?, ?, ?, ?, ?)`,
        [sessionId, 'w-a', day, startedAt, `${day}T19:52:00.000Z`]
      );
      for (const [exerciseId, sets] of Object.entries(session.sets)) {
        for (const [index, [kg, reps]] of sets.entries()) {
          await db.runAsync(
            `INSERT INTO session_sets
               (session_id, exercise_id, set_index, kg, reps, logged_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [sessionId, exerciseId, index, kg, reps, startedAt]
          );
        }
      }
    }

    for (const [key, value] of DEFAULT_SETTINGS) {
      await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
    }
  });
}
