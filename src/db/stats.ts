import { isoDay, shiftDays, startOfWeek } from '../lib/date';
import { getDatabase } from './client';

/** Volume de uma série = carga × repetições. É a métrica do app inteiro. */
const VOLUME = 'ss.kg * ss.reps';

export type DaySummary = {
  sessionId: string;
  day: string;
  workoutTitle: string | null;
  exercises: number;
  sets: number;
  volume: number;
  minutes: number | null;
};

export type WeekVolume = {
  weekStart: string;
  volume: number;
};

/** Dias com treino concluído no intervalo — pinta o calendário. */
export async function trainedDays(fromDay: string, toDay: string): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ day: string }>(
    `SELECT DISTINCT day FROM sessions
     WHERE finished_at IS NOT NULL AND day BETWEEN ? AND ?
     ORDER BY day`,
    [fromDay, toDay]
  );
  return rows.map((r) => r.day);
}

/** O que foi feito num dia: alimenta o card do calendário. */
export async function daySummary(day: string): Promise<DaySummary | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    id: string;
    day: string;
    title: string | null;
    exercises: number;
    sets: number;
    volume: number;
    started_at: string;
    finished_at: string;
  }>(
    `SELECT
       s.id,
       s.day,
       w.title,
       COUNT(DISTINCT ss.exercise_id) AS exercises,
       COUNT(ss.id) AS sets,
       COALESCE(SUM(${VOLUME}), 0) AS volume,
       s.started_at,
       s.finished_at
     FROM sessions s
     LEFT JOIN workouts w ON w.id = s.workout_id
     LEFT JOIN session_sets ss ON ss.session_id = s.id
     WHERE s.day = ? AND s.finished_at IS NOT NULL
     GROUP BY s.id
     ORDER BY s.started_at DESC
     LIMIT 1`,
    [day]
  );
  if (!row) return null;

  const minutes =
    row.started_at && row.finished_at
      ? Math.max(
          1,
          Math.round(
            (new Date(row.finished_at).getTime() - new Date(row.started_at).getTime()) / 60000
          )
        )
      : null;

  return {
    sessionId: row.id,
    day: row.day,
    workoutTitle: row.title,
    exercises: row.exercises,
    sets: row.sets,
    volume: row.volume,
    minutes,
  };
}

/** Volume por semana, da mais antiga para a mais recente. Semana começa na segunda. */
export async function weeklyVolume(weeks: number): Promise<WeekVolume[]> {
  const db = await getDatabase();
  const firstWeek = startOfWeek(shiftDays(new Date(), -(weeks - 1) * 7));

  const rows = await db.getAllAsync<{ day: string; volume: number }>(
    `SELECT s.day, COALESCE(SUM(${VOLUME}), 0) AS volume
     FROM sessions s
     JOIN session_sets ss ON ss.session_id = s.id
     WHERE s.finished_at IS NOT NULL AND s.day >= ?
     GROUP BY s.day`,
    [isoDay(firstWeek)]
  );

  const buckets = new Map<string, number>();
  for (let i = 0; i < weeks; i++) {
    buckets.set(isoDay(shiftDays(firstWeek, i * 7)), 0);
  }
  for (const row of rows) {
    const key = isoDay(startOfWeek(new Date(`${row.day}T00:00:00`)));
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + row.volume);
  }

  return [...buckets.entries()].map(([weekStart, volume]) => ({ weekStart, volume }));
}

export type HomeSummary = {
  lastDay: string | null;
  doneThisWeek: number;
  volumeChangePercent: number | null;
};

export async function homeSummary(daysPerWeek: number): Promise<HomeSummary> {
  const db = await getDatabase();

  const last = await db.getFirstAsync<{ day: string }>(
    'SELECT day FROM sessions WHERE finished_at IS NOT NULL ORDER BY day DESC LIMIT 1'
  );

  const weekStart = isoDay(startOfWeek(new Date()));
  const done = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(DISTINCT day) AS count FROM sessions
     WHERE finished_at IS NOT NULL AND day >= ?`,
    [weekStart]
  );

  // Variação do mês: as quatro semanas recentes contra as quatro anteriores.
  const volumes = await weeklyVolume(8);
  const previous = volumes.slice(0, 4).reduce((sum, w) => sum + w.volume, 0);
  const recent = volumes.slice(4).reduce((sum, w) => sum + w.volume, 0);
  const change = previous > 0 ? Math.round(((recent - previous) / previous) * 100) : null;

  return {
    lastDay: last?.day ?? null,
    doneThisWeek: Math.min(done?.count ?? 0, daysPerWeek),
    volumeChangePercent: change,
  };
}

export type ExerciseProgress = {
  exerciseId: string;
  name: string;
  loads: number[];
  changePercent: number | null;
};

/** Evolução da maior carga por sessão, dos exercícios mais treinados. */
export async function exerciseProgress(limit = 3): Promise<ExerciseProgress[]> {
  const db = await getDatabase();
  const top = await db.getAllAsync<{ exercise_id: string; name: string }>(
    `SELECT ss.exercise_id, e.name
     FROM session_sets ss
     JOIN sessions s ON s.id = ss.session_id
     JOIN exercises e ON e.id = ss.exercise_id
     WHERE s.finished_at IS NOT NULL
     GROUP BY ss.exercise_id
     ORDER BY COUNT(DISTINCT ss.session_id) DESC, e.name
     LIMIT ?`,
    [limit]
  );

  const out: ExerciseProgress[] = [];
  for (const exercise of top) {
    const rows = await db.getAllAsync<{ top_load: number }>(
      `SELECT MAX(ss.kg) AS top_load
       FROM session_sets ss
       JOIN sessions s ON s.id = ss.session_id
       WHERE ss.exercise_id = ? AND s.finished_at IS NOT NULL
       GROUP BY s.id
       ORDER BY s.started_at`,
      [exercise.exercise_id]
    );
    const loads = rows.map((r) => r.top_load);
    const first = loads[0];
    const last = loads[loads.length - 1];
    out.push({
      exerciseId: exercise.exercise_id,
      name: exercise.name,
      loads,
      changePercent:
        first > 0 && loads.length > 1 ? Math.round(((last - first) / first) * 100) : null,
    });
  }
  return out;
}

export type RecordRow = {
  exerciseId: string;
  name: string;
  kg: number;
  reps: number;
  day: string;
};

/** Melhor marca de cada exercício, das mais pesadas para as mais leves. */
export async function records(limit = 5): Promise<RecordRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<RecordRow>(
    `SELECT
       ss.exercise_id AS exerciseId,
       e.name AS name,
       ss.kg AS kg,
       MAX(ss.reps) AS reps,
       s.day AS day
     FROM session_sets ss
     JOIN sessions s ON s.id = ss.session_id
     JOIN exercises e ON e.id = ss.exercise_id
     WHERE s.finished_at IS NOT NULL
       AND ss.kg = (
         SELECT MAX(x.kg) FROM session_sets x
         JOIN sessions xs ON xs.id = x.session_id
         WHERE x.exercise_id = ss.exercise_id AND xs.finished_at IS NOT NULL
       )
     GROUP BY ss.exercise_id
     ORDER BY ss.kg DESC
     LIMIT ?`,
    [limit]
  );
}

export type PeriodKpis = {
  volume: number;
  sessions: number;
  perWeek: number;
  consistency: number;
  topLoad: { name: string; kg: number } | null;
};

export async function periodKpis(weeks: number, daysPerWeek: number): Promise<PeriodKpis> {
  const db = await getDatabase();
  const from = isoDay(startOfWeek(shiftDays(new Date(), -(weeks - 1) * 7)));

  const totals = await db.getFirstAsync<{ volume: number; sessions: number }>(
    `SELECT
       COALESCE(SUM(${VOLUME}), 0) AS volume,
       COUNT(DISTINCT s.id) AS sessions
     FROM sessions s
     JOIN session_sets ss ON ss.session_id = s.id
     WHERE s.finished_at IS NOT NULL AND s.day >= ?`,
    [from]
  );

  const heaviest = await db.getFirstAsync<{ name: string; kg: number }>(
    `SELECT e.name AS name, ss.kg AS kg
     FROM session_sets ss
     JOIN sessions s ON s.id = ss.session_id
     JOIN exercises e ON e.id = ss.exercise_id
     WHERE s.finished_at IS NOT NULL AND s.day >= ?
     ORDER BY ss.kg DESC
     LIMIT 1`,
    [from]
  );

  const sessions = totals?.sessions ?? 0;
  const perWeek = weeks > 0 ? sessions / weeks : 0;

  return {
    volume: totals?.volume ?? 0,
    sessions,
    perWeek,
    consistency: daysPerWeek > 0 ? Math.min(100, Math.round((perWeek / daysPerWeek) * 100)) : 0,
    topLoad: heaviest?.name ? { name: heaviest.name, kg: heaviest.kg } : null,
  };
}

/** Quantos treinos já foram concluídos antes do dia — gira a ordem A, B, C. */
export async function sessionsBefore(day: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(DISTINCT day) AS count FROM sessions WHERE finished_at IS NOT NULL AND day < ?',
    [day]
  );
  return row?.count ?? 0;
}
