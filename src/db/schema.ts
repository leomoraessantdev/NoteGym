/**
 * Migrações do banco. Cada entrada roda uma vez, em ordem, e o índice vira
 * `user_version`. Nunca edite uma migração já publicada — acrescente outra.
 */
export const migrations: string[][] = [
  [
    `CREATE TABLE exercises (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      muscle_group TEXT NOT NULL
    );`,

    `CREATE TABLE workouts (
      id TEXT PRIMARY KEY,
      letter TEXT NOT NULL,
      title TEXT NOT NULL,
      position INTEGER NOT NULL
    );`,

    `CREATE TABLE workout_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL REFERENCES exercises(id),
      target_sets INTEGER NOT NULL,
      rep_min INTEGER NOT NULL,
      rep_max INTEGER NOT NULL,
      position INTEGER NOT NULL
    );`,

    `CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      workout_id TEXT REFERENCES workouts(id) ON DELETE SET NULL,
      day TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT
    );`,

    `CREATE TABLE session_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL REFERENCES exercises(id),
      set_index INTEGER NOT NULL,
      kg REAL NOT NULL,
      reps INTEGER NOT NULL,
      logged_at TEXT NOT NULL,
      UNIQUE (session_id, exercise_id, set_index)
    );`,

    `CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );`,

    `CREATE INDEX idx_session_sets_exercise ON session_sets (exercise_id);`,
    `CREATE INDEX idx_sessions_day ON sessions (day);`,
    `CREATE INDEX idx_workout_exercises_workout ON workout_exercises (workout_id, position);`,
  ],

  [
    // Exercício criado pelo usuário, com nome livre.
    `ALTER TABLE exercises ADD COLUMN is_custom INTEGER NOT NULL DEFAULT 0;`,

    // Agenda do modo "dias fixos": um treino por dia da semana.
    // weekday: 0 segunda ... 6 domingo. Sem linha = descanso.
    `CREATE TABLE schedule (
      weekday INTEGER PRIMARY KEY,
      workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE
    );`,
  ],
];
