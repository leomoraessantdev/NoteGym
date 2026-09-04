import * as SQLite from 'expo-sqlite';
import { migrations } from './schema';
import { seedIfEmpty, seedScheduleIfEmpty } from './seed';

const DATABASE_NAME = 'notegym.db';

let instance: SQLite.SQLiteDatabase | null = null;
let opening: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Abre o banco uma vez por processo, aplica as migrações pendentes e semeia
 * o conteúdo inicial. Chamadas concorrentes esperam a mesma promessa.
 */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (instance) return Promise.resolve(instance);
  if (opening) return opening;

  opening = (async () => {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    await migrate(db);
    await seedIfEmpty(db);
    await seedScheduleIfEmpty(db);
    instance = db;
    return db;
  })();

  return opening;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  for (let version = current; version < migrations.length; version++) {
    await db.withTransactionAsync(async () => {
      for (const statement of migrations[version]) {
        await db.execAsync(statement);
      }
      // A versão sobe dentro da mesma transação. Fora dela, um encerramento no
      // intervalo deixaria as tabelas criadas com a versão antiga gravada, e a
      // migração rodaria de novo por cima — "table already exists" para sempre.
      // PRAGMA não aceita parâmetro ligado; o valor vem do índice do laço.
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
