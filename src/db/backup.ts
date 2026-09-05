import {
  type Backup,
  type BackupTables,
  type Cell,
  TABLE_NAMES,
  serializeBackup,
} from '../data/backup';
import { getDatabase } from './client';

/**
 * Cópia e restauração do banco inteiro.
 *
 * Exportar lê tudo; restaurar troca tudo, numa transação só. Meia restauração
 * seria pior do que nenhuma: o histórico ficaria misturado entre dois
 * aparelhos sem ninguém perceber.
 */
const COLUMNS: Record<keyof BackupTables, string[]> = {
  exercises: ['id', 'name', 'muscle_group', 'is_custom'],
  workouts: ['id', 'letter', 'title', 'position'],
  workout_exercises: [
    'workout_id',
    'exercise_id',
    'target_sets',
    'rep_min',
    'rep_max',
    'position',
  ],
  sessions: ['id', 'workout_id', 'day', 'started_at', 'finished_at'],
  session_sets: ['session_id', 'exercise_id', 'set_index', 'kg', 'reps', 'logged_at'],
  schedule: ['weekday', 'workout_id'],
  settings: ['key', 'value'],
};

export async function exportBackup(): Promise<string> {
  const db = await getDatabase();
  const tables = {} as Record<string, unknown>;

  for (const table of TABLE_NAMES) {
    tables[table] = await db.getAllAsync<Record<string, unknown>>(
      'SELECT ' + COLUMNS[table].join(', ') + ' FROM ' + table
    );
  }

  return serializeBackup(tables as unknown as BackupTables, new Date().toISOString());
}

/**
 * Troca o conteúdo do banco pelo do arquivo.
 *
 * Apaga na ordem inversa das dependências e insere na ordem delas, para as
 * chaves estrangeiras nunca apontarem para o vazio no meio do caminho.
 */
export async function restoreBackup(backup: Backup): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    for (const table of [...TABLE_NAMES].reverse()) {
      await db.runAsync('DELETE FROM ' + table);
    }

    for (const table of TABLE_NAMES) {
      const columns = COLUMNS[table];
      const slots = columns.map(() => '?').join(', ');
      const sql = 'INSERT INTO ' + table + ' (' + columns.join(', ') + ') VALUES (' + slots + ')';

      // Primitivos garantidos por `parseBackup`, que roda antes de apagar nada.
      for (const row of backup[table] as unknown as Record<string, Cell>[]) {
        await db.runAsync(
          sql,
          columns.map((column) => row[column] ?? null)
        );
      }
    }
  });
}
