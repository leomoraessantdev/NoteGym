import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Conteúdo do primeiro uso. Só roda com o banco vazio — depois disso o app
 * vive do que o usuário grava.
 *
 * A biblioteca começa com a lista do handoff mais os exercícios necessários
 * para montar os três treinos de exemplo.
 */
const EXERCISES: [id: string, name: string, group: string][] = [
  // Peito
  ['supino-reto', 'Supino reto', 'Peito'],
  ['supino-inclinado', 'Supino inclinado', 'Peito'],
  ['supino-declinado', 'Supino declinado', 'Peito'],
  ['supino-halteres', 'Supino com halteres', 'Peito'],
  ['crucifixo', 'Crucifixo', 'Peito'],
  ['crucifixo-inclinado', 'Crucifixo inclinado', 'Peito'],
  ['crossover', 'Crossover', 'Peito'],
  ['peck-deck', 'Peck deck', 'Peito'],
  ['flexao', 'Flexão de braço', 'Peito'],
  ['pullover', 'Pullover', 'Peito'],

  // Costas
  ['puxada-alta', 'Puxada alta', 'Costas'],
  ['puxada-triangulo', 'Puxada triângulo', 'Costas'],
  ['barra-fixa', 'Barra fixa', 'Costas'],
  ['remada-curvada', 'Remada curvada', 'Costas'],
  ['remada-unilateral', 'Remada unilateral', 'Costas'],
  ['remada-baixa', 'Remada baixa', 'Costas'],
  ['remada-cavalinho', 'Remada cavalinho', 'Costas'],
  ['levantamento-terra', 'Levantamento terra', 'Costas'],
  ['pulldown-braco-reto', 'Pulldown com braço reto', 'Costas'],
  ['encolhimento', 'Encolhimento de ombros', 'Costas'],

  // Pernas
  ['agachamento', 'Agachamento livre', 'Pernas'],
  ['agachamento-smith', 'Agachamento no Smith', 'Pernas'],
  ['agachamento-frontal', 'Agachamento frontal', 'Pernas'],
  ['leg-press', 'Leg press', 'Pernas'],
  ['hack-machine', 'Hack machine', 'Pernas'],
  ['cadeira-extensora', 'Cadeira extensora', 'Pernas'],
  ['mesa-flexora', 'Mesa flexora', 'Pernas'],
  ['cadeira-flexora', 'Cadeira flexora', 'Pernas'],
  ['stiff', 'Stiff', 'Pernas'],
  ['afundo', 'Afundo', 'Pernas'],
  ['bulgaro', 'Agachamento búlgaro', 'Pernas'],
  ['passada', 'Passada', 'Pernas'],
  ['elevacao-pelvica', 'Elevação pélvica', 'Pernas'],
  ['cadeira-abdutora', 'Cadeira abdutora', 'Pernas'],
  ['cadeira-adutora', 'Cadeira adutora', 'Pernas'],
  ['panturrilha', 'Panturrilha em pé', 'Pernas'],
  ['panturrilha-sentado', 'Panturrilha sentado', 'Pernas'],

  // Ombros
  ['desenvolvimento', 'Desenvolvimento', 'Ombros'],
  ['desenvolvimento-arnold', 'Desenvolvimento Arnold', 'Ombros'],
  ['elevacao-lateral', 'Elevação lateral', 'Ombros'],
  ['elevacao-frontal', 'Elevação frontal', 'Ombros'],
  ['crucifixo-inverso', 'Crucifixo inverso', 'Ombros'],
  ['remada-alta', 'Remada alta', 'Ombros'],
  ['face-pull', 'Face pull', 'Ombros'],

  // Braços
  ['rosca-direta', 'Rosca direta', 'Braços'],
  ['rosca-alternada', 'Rosca alternada', 'Braços'],
  ['rosca-martelo', 'Rosca martelo', 'Braços'],
  ['rosca-scott', 'Rosca scott', 'Braços'],
  ['rosca-concentrada', 'Rosca concentrada', 'Braços'],
  ['rosca-inversa', 'Rosca inversa', 'Braços'],
  ['triceps-corda', 'Tríceps corda', 'Braços'],
  ['triceps-testa', 'Tríceps testa', 'Braços'],
  ['triceps-frances', 'Tríceps francês', 'Braços'],
  ['triceps-banco', 'Tríceps banco', 'Braços'],
  ['triceps-coice', 'Tríceps coice', 'Braços'],
  ['mergulho', 'Mergulho em paralelas', 'Braços'],
  ['punho-rosca', 'Rosca de punho', 'Braços'],

  // Abdômen
  ['abdominal-supra', 'Abdominal supra', 'Abdômen'],
  ['abdominal-infra', 'Abdominal infra', 'Abdômen'],
  ['prancha', 'Prancha', 'Abdômen'],
  ['prancha-lateral', 'Prancha lateral', 'Abdômen'],
  ['elevacao-pernas', 'Elevação de pernas', 'Abdômen'],
  ['abdominal-obliquo', 'Abdominal oblíquo', 'Abdômen'],
  ['abdominal-roda', 'Abdominal na roda', 'Abdômen'],

  // Cardio
  ['esteira', 'Esteira', 'Cardio'],
  ['bicicleta', 'Bicicleta ergométrica', 'Cardio'],
  ['eliptico', 'Elíptico', 'Cardio'],
  ['escada', 'Escada', 'Cardio'],
  ['corda-naval', 'Corda naval', 'Cardio'],
  ['pular-corda', 'Pular corda', 'Cardio'],
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
 * O app nasce sem histórico: recorde, gráfico e "+x% no mês" só aparecem
 * quando o usuário registra o primeiro treino de verdade.
 */
const DEFAULT_SETTINGS: [key: string, value: string][] = [
  ['profile_name', 'Você'],
  ['goal', 'Hipertrofia'],
  ['unit', 'kg'],
  ['days_per_week', '5'],
  ['calendar_mode', 'fixed'],
  ['rest_seconds', '90'],
  ['notifications', 'Ativas'],
  ['account_email', ''],
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

    for (const [key, value] of DEFAULT_SETTINGS) {
      await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
    }
  });
}

/**
 * Agenda padrão do modo "dias fixos": segunda A, terça B, quinta C, sexta A,
 * sábado B; quarta e domingo livres. Roda também em bancos que já existiam
 * antes da agenda, e o usuário troca tudo depois no app.
 */
export async function seedScheduleIfEmpty(db: SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM schedule'
  );
  if ((existing?.count ?? 0) > 0) return;

  const workouts = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM workouts ORDER BY position'
  );
  if (workouts.length === 0) return;

  // weekday: 0 segunda ... 6 domingo. null = descanso.
  const plan: (number | null)[] = [0, 1, null, 2, 0, 1, null];

  for (const [weekday, slot] of plan.entries()) {
    if (slot === null) continue;
    const workout = workouts[slot % workouts.length];
    await db.runAsync('INSERT INTO schedule (weekday, workout_id) VALUES (?, ?)', [
      weekday,
      workout.id,
    ]);
  }
}
