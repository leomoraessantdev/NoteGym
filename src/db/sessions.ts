import { isoDay } from '../lib/date';
import { getDatabase } from './client';
import type { BestMarkRow, ExerciseSessionRow, LoggedSetRow, SessionRow } from './types';

/** Abre uma sessão nova, ou devolve a que ficou aberta (app fechado no meio). */
export async function startOrResumeSession(workoutId: string): Promise<SessionRow> {
  const db = await getDatabase();

  const open = await db.getFirstAsync<SessionRow>(
    'SELECT * FROM sessions WHERE finished_at IS NULL ORDER BY started_at DESC LIMIT 1'
  );
  if (open) return open;

  const now = new Date();
  const id = `s-${now.getTime()}`;
  const day = isoDay(now);
  await db.runAsync(
    'INSERT INTO sessions (id, workout_id, day, started_at, finished_at) VALUES (?, ?, ?, ?, NULL)',
    [id, workoutId, day, now.toISOString()]
  );
  return { id, workout_id: workoutId, day, started_at: now.toISOString(), finished_at: null };
}

/** Concluir a série grava; desmarcar apaga. O registro é a verdade. */
export async function logSet(
  sessionId: string,
  exerciseId: string,
  setIndex: number,
  kg: number,
  reps: number
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO session_sets (session_id, exercise_id, set_index, kg, reps, logged_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (session_id, exercise_id, set_index)
     DO UPDATE SET kg = excluded.kg, reps = excluded.reps, logged_at = excluded.logged_at`,
    [sessionId, exerciseId, setIndex, kg, reps, new Date().toISOString()]
  );
}

export async function unlogSet(
  sessionId: string,
  exerciseId: string,
  setIndex: number
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'DELETE FROM session_sets WHERE session_id = ? AND exercise_id = ? AND set_index = ?',
    [sessionId, exerciseId, setIndex]
  );
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

/** Histórico do exercício, mais recente primeiro. */
export async function exerciseHistory(
  exerciseId: string,
  limit = 8
): Promise<ExerciseSessionRow[]> {
  const db = await getDatabase();
  const sessions = await db.getAllAsync<{ session_id: string; day: string }>(
    `SELECT DISTINCT ss.session_id, s.day
     FROM session_sets ss
     JOIN sessions s ON s.id = ss.session_id
     WHERE ss.exercise_id = ? AND s.finished_at IS NOT NULL
     ORDER BY s.started_at DESC
     LIMIT ?`,
    [exerciseId, limit]
  );

  const out: ExerciseSessionRow[] = [];
  for (const session of sessions) {
    const sets = await db.getAllAsync<LoggedSetRow>(
      `SELECT set_index, kg, reps FROM session_sets
       WHERE session_id = ? AND exercise_id = ? ORDER BY set_index`,
      [session.session_id, exerciseId]
    );
    out.push({ session_id: session.session_id, day: session.day, sets });
  }
  return out;
}

/** Melhor marca: maior carga; empate desempata por repetições. */
export async function bestMark(exerciseId: string): Promise<BestMarkRow | null> {
  const db = await getDatabase();
  return db.getFirstAsync<BestMarkRow>(
    `SELECT ss.kg, ss.reps, s.day
     FROM session_sets ss
     JOIN sessions s ON s.id = ss.session_id
     WHERE ss.exercise_id = ? AND s.finished_at IS NOT NULL
     ORDER BY ss.kg DESC, ss.reps DESC
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
