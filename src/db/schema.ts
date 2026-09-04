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

  [
    // O protótipo semeava um histórico de exemplo. Ele virava recorde, gráfico
    // e "+x% no mês" de treinos que ninguém fez — some com ele.
    // As séries saem explicitamente: não dá para depender do cascade estar ligado.
    `DELETE FROM session_sets WHERE session_id LIKE 'seed-%';`,
    `DELETE FROM sessions WHERE id LIKE 'seed-%';`,

    // Conta fictícia do mesmo protótipo. O nome do perfil fica: quem já usava
    // pode ter adotado o que estava lá, e trocar é um toque no Perfil.
    `UPDATE settings SET value = ''
       WHERE key = 'account_email' AND value = 'leonardo@notegym.app';`,

    // Um exercício não pode entrar duas vezes no mesmo treino: os dois cards
    // gravariam na mesma chave (sessão, exercício, índice) e um apagaria o
    // outro. Tira as repetições antigas e trava a regra no banco.
    `DELETE FROM workout_exercises
       WHERE id NOT IN (
         SELECT MIN(id) FROM workout_exercises GROUP BY workout_id, exercise_id
       );`,
    `CREATE UNIQUE INDEX idx_workout_exercises_unique
       ON workout_exercises (workout_id, exercise_id);`,
  ],
];
