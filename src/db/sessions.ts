import { isoDay } from '../lib/date';
import { newId } from '../lib/id';
import { getDatabase } from './client';
import type {
  BestMarkRow,
  ExerciseSessionRow,
  LoggedSetRow,
  OpenSessionRow,
  SessionDetail,
  SessionDetailExercise,
  SessionRow,
} from './types';

/**
 * Fecha uma sessão que ficou para trás.
 *
 * O fim é a última série registrada, não o instante em que o app percebeu:
 * quem parou ontem às 20h não treinou vinte e quatro horas seguidas. Sessão
 * sem série nenhuma some, para não sujar o histórico.
 */
async function closeStaleSession(sessionId: string): Promise<void> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ last: string | null }>(
    'SELECT MAX(logged_at) AS last FROM session_sets WHERE session_id = ?',
    [sessionId]
  );

  if (!row?.last) {
    await db.runAsync('DELETE FROM sessions WHERE id = ?', [sessionId]);
    return;
  }
  await db.runAsync('UPDATE sessions SET finished_at = ? WHERE id = ?', [row.last, sessionId]);
}

/**
 * Encerra o que ficou aberto de dias anteriores.
 *
 * Roda na abertura do app. Sem isto, a faixa "treino em andamento" ofereceria
 * retomar uma sessão de ontem que não pode mais receber série nenhuma, e o
 * treino de anteontem ficaria eternamente sem data de fim.
 */
export async function closeSessionsFromPreviousDays(): Promise<void> {
  const db = await getDatabase();
  const stale = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM sessions WHERE finished_at IS NULL AND day < ?',
    [isoDay(new Date())]
  );
  for (const session of stale) {
    await closeStaleSession(session.id);
  }
}

/**
 * Abre a sessão do treino de hoje, ou devolve a que ficou aberta nele.
 *
 * Retomar só vale para o mesmo treino no mesmo dia. Uma sessão aberta de outro
 * treino — ou de ontem — receberia as séries de agora com a data e o treino
 * errados, e o calendário passaria a mentir; ela é fechada antes.
 */
export async function startOrResumeSession(workoutId: string): Promise<SessionRow> {
  const db = await getDatabase();
  const now = new Date();
  const day = isoDay(now);

  const open = await db.getAllAsync<SessionRow>(
    'SELECT * FROM sessions WHERE finished_at IS NULL ORDER BY started_at DESC'
  );
  const resumable = open.find((s) => s.workout_id === workoutId && s.day === day) ?? null;

  for (const stale of open) {
    if (stale.id === resumable?.id) continue;
    await closeStaleSession(stale.id);
  }

  if (resumable) return resumable;

  const id = newId('s');
  const startedAt = now.toISOString();
  await db.runAsync(
    'INSERT INTO sessions (id, workout_id, day, started_at, finished_at) VALUES (?, ?, ?, ?, NULL)',
    [id, workoutId, day, startedAt]
  );
  return { id, workout_id: workoutId, day, started_at: startedAt, finished_at: null };
}

/** Séries já gravadas nesta sessão, para reabrir a tela no mesmo estado. */
export async function sessionSets(sessionId: string): Promise<Record<string, LoggedSetRow[]>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    exercise_id: string;
    set_index: number;
    kg: number;
    reps: number;
  }>(
    `SELECT exercise_id, set_index, kg, reps FROM session_sets
     WHERE session_id = ? ORDER BY exercise_id, set_index`,
    [sessionId]
  );

  const byExercise: Record<string, LoggedSetRow[]> = {};
  for (const row of rows) {
    (byExercise[row.exercise_id] ??= []).push({
      set_index: row.set_index,
      kg: row.kg,
      reps: row.reps,
    });
  }
  return byExercise;
}

/** Sessão sem série nenhuma não vira treino: some em vez de sujar o histórico. */
export async function finishSession(sessionId: string): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM session_sets WHERE session_id = ?',
    [sessionId]
  );

  if ((row?.count ?? 0) === 0) {
    await db.runAsync('DELETE FROM sessions WHERE id = ?', [sessionId]);
    return false;
  }

  await db.runAsync('UPDATE sessions SET finished_at = ? WHERE id = ?', [
    new Date().toISOString(),
    sessionId,
  ]);
  return true;
}

/** Sair sem registrar nada não deixa sessão órfã aberta. */
export async function discardSessionIfEmpty(sessionId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `DELETE FROM sessions
     WHERE id = ? AND NOT EXISTS (SELECT 1 FROM session_sets WHERE session_id = ?)`,
    [sessionId, sessionId]
  );
}

/** Séries do exercício na última sessão concluída — a linha "Semana passada". */
export async function previousSets(
  exerciseId: string,
  currentSessionId: string
): Promise<LoggedSetRow[]> {
  const db = await getDatabase();
  const last = await db.getFirstAsync<{ session_id: string }>(
    `SELECT ss.session_id
     FROM session_sets ss
     JOIN sessions s ON s.id = ss.session_id
     WHERE ss.exercise_id = ? AND ss.session_id <> ? AND s.finished_at IS NOT NULL
     ORDER BY s.started_at DESC
     LIMIT 1`,
    [exerciseId, currentSessionId]
  );
  if (!last) return [];

  return db.getAllAsync<LoggedSetRow>(
    `SELECT set_index, kg, reps FROM session_sets
     WHERE session_id = ? AND exercise_id = ? ORDER BY set_index`,
    [last.session_id, exerciseId]
  );
}

/**
 * Histórico do exercício, mais recente primeiro.
 *
 * Uma consulta só: as sessões que interessam saem de uma subconsulta e as
 * séries vêm junto. Uma ida ao banco por sessão travava a abertura do sheet
 * de anotações em quem já tem meses de treino.
 */
export async function exerciseHistory(
  exerciseId: string,
  limit = 8
): Promise<ExerciseSessionRow[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    session_id: string;
    day: string;
    set_index: number;
    kg: number;
    reps: number;
  }>(
    `SELECT ss.session_id, s.day, ss.set_index, ss.kg, ss.reps
     FROM session_sets ss
     JOIN sessions s ON s.id = ss.session_id
     WHERE ss.exercise_id = ?
       AND ss.session_id IN (
         SELECT recent.session_id FROM (
           SELECT ss2.session_id AS session_id, MAX(s2.started_at) AS started_at
           FROM session_sets ss2
           JOIN sessions s2 ON s2.id = ss2.session_id
           WHERE ss2.exercise_id = ? AND s2.finished_at IS NOT NULL
           GROUP BY ss2.session_id
           ORDER BY started_at DESC
           LIMIT ?
         ) AS recent
       )
     ORDER BY s.started_at DESC, ss.set_index`,
    [exerciseId, exerciseId, limit]
  );

  const bySession = new Map<string, ExerciseSessionRow>();
  for (const row of rows) {
    const entry = bySession.get(row.session_id) ?? {
      session_id: row.session_id,
      day: row.day,
      sets: [],
    };
    entry.sets.push({ set_index: row.set_index, kg: row.kg, reps: row.reps });
    bySession.set(row.session_id, entry);
  }
  return [...bySession.values()];
}

/**
 * Melhor marca: maior carga, empate por repetições, e o dia mais antigo em que
 * ela foi atingida — foi ali que o recorde nasceu. Mesmo critério de `records`.
 */
export async function bestMark(exerciseId: string): Promise<BestMarkRow | null> {
  const db = await getDatabase();
  return db.getFirstAsync<BestMarkRow>(
    `SELECT ss.kg, ss.reps, s.day
     FROM session_sets ss
     JOIN sessions s ON s.id = ss.session_id
     WHERE ss.exercise_id = ? AND s.finished_at IS NOT NULL
     ORDER BY ss.kg DESC, ss.reps DESC, s.day ASC
     LIMIT 1`,
    [exerciseId]
  );
}

/**
 * Reescreve as séries de um exercício na sessão. Usado quando o usuário remove
 * uma série do meio: os índices seguintes precisam fechar a lacuna, senão a
 * chave (sessão, exercício, índice) fica furada.
 */
export async function rewriteExerciseSets(
  sessionId: string,
  exerciseId: string,
  sets: { kg: number; reps: number }[]
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM session_sets WHERE session_id = ? AND exercise_id = ?', [
      sessionId,
      exerciseId,
    ]);
    for (const [index, set] of sets.entries()) {
      await db.runAsync(
        `INSERT INTO session_sets (session_id, exercise_id, set_index, kg, reps, logged_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [sessionId, exerciseId, index, set.kg, set.reps, now]
      );
    }
  });
}

/** A sessão que ficou aberta, se houver. Alimenta a faixa de "retomar". */
export async function getOpenSession(): Promise<OpenSessionRow | null> {
  const db = await getDatabase();
  return db.getFirstAsync<OpenSessionRow>(
    `SELECT
       s.id,
       s.workout_id,
       s.day,
       s.started_at,
       w.title AS workout_title,
       (SELECT COUNT(*) FROM session_sets ss WHERE ss.session_id = s.id) AS logged_sets
     FROM sessions s
     LEFT JOIN workouts w ON w.id = s.workout_id
     WHERE s.finished_at IS NULL
     ORDER BY s.started_at DESC
     LIMIT 1`
  );
}

/** Tudo que foi registrado numa sessão, agrupado por exercício. */
export async function sessionDetail(sessionId: string): Promise<SessionDetail | null> {
  const db = await getDatabase();

  const session = await db.getFirstAsync<{
    id: string;
    day: string;
    started_at: string;
    finished_at: string | null;
    workout_title: string | null;
  }>(
    `SELECT s.id, s.day, s.started_at, s.finished_at, w.title AS workout_title
     FROM sessions s
     LEFT JOIN workouts w ON w.id = s.workout_id
     WHERE s.id = ?`,
    [sessionId]
  );
  if (!session) return null;

  const rows = await db.getAllAsync<{
    exercise_id: string;
    name: string;
    set_index: number;
    kg: number;
    reps: number;
  }>(
    `SELECT ss.exercise_id, e.name, ss.set_index, ss.kg, ss.reps
     FROM session_sets ss
     JOIN exercises e ON e.id = ss.exercise_id
     WHERE ss.session_id = ?
     ORDER BY e.name, ss.set_index`,
    [sessionId]
  );

  const byExercise = new Map<string, SessionDetailExercise>();
  for (const row of rows) {
    const entry = byExercise.get(row.exercise_id) ?? {
      exerciseId: row.exercise_id,
      name: row.name,
      sets: [],
    };
    entry.sets.push({ set_index: row.set_index, kg: row.kg, reps: row.reps });
    byExercise.set(row.exercise_id, entry);
  }

  return {
    id: session.id,
    day: session.day,
    startedAt: session.started_at,
    finishedAt: session.finished_at,
    workoutTitle: session.workout_title,
    exercises: [...byExercise.values()],
  };
}

/** Corrige carga ou repetições de uma série já gravada. */
export async function updateLoggedSet(
  sessionId: string,
  exerciseId: string,
  setIndex: number,
  kg: number,
  reps: number
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE session_sets SET kg = ?, reps = ?
     WHERE session_id = ? AND exercise_id = ? AND set_index = ?`,
    [kg, reps, sessionId, exerciseId, setIndex]
  );
}

/**
 * Joga a sessão fora com tudo que foi registrado nela. Só acontece quando o
 * usuário escolhe "Descartar este treino" ao sair.
 */
export async function discardSession(sessionId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM sessions WHERE id = ?', [sessionId]);
}
