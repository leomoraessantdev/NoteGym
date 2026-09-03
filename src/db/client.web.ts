import initSqlJs, { type Database } from 'sql.js';
import { migrations } from './schema';
import { seedIfEmpty } from './seed';

/**
 * Driver de banco do preview web.
 *
 * O `expo-sqlite` no navegador depende de OPFS num worker, que não sobe no
 * servidor de desenvolvimento. Aqui o mesmo SQL roda em sql.js e os bytes do
 * arquivo ficam no localStorage. No Android e no iOS vale `client.ts`, com
 * SQLite nativo — o SQL e as migrações são exatamente os mesmos.
 */
const STORAGE_KEY = 'notegym.db';

/** A camada de dados só usa estes cinco métodos. */
export type Db = {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: unknown[]): Promise<void>;
  getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null>;
  getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]>;
  withTransactionAsync(body: () => Promise<void>): Promise<void>;
};

let instance: Db | null = null;
let opening: Promise<Db> | null = null;

function load(): Uint8Array | undefined {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return undefined;
    return Uint8Array.from(atob(saved), (c) => c.charCodeAt(0));
  } catch {
    return undefined;
  }
}

function persist(database: Database): void {
  try {
    const bytes = database.export();
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    localStorage.setItem(STORAGE_KEY, btoa(binary));
  } catch (error) {
    console.warn('Não deu para salvar o banco no navegador', error);
  }
}

function wrap(database: Database): Db {
  /**
   * `export()` fecha a transação aberta, então dentro de uma transação a
   * gravação espera o commit.
   */
  let inTransaction = false;
  const save = () => {
    if (!inTransaction) persist(database);
  };

  const select = <T>(sql: string, params: unknown[] = []): T[] => {
    const statement = database.prepare(sql);
    statement.bind(params as never);
    const rows: T[] = [];
    while (statement.step()) rows.push(statement.getAsObject() as T);
    statement.free();
    return rows;
  };

  return {
    async execAsync(sql) {
      database.exec(sql);
      save();
    },
    async runAsync(sql, params = []) {
      database.run(sql, params as never);
      save();
    },
    async getFirstAsync<T>(sql: string, params?: unknown[]) {
      return select<T>(sql, params)[0] ?? null;
    },
    async getAllAsync<T>(sql: string, params?: unknown[]) {
      return select<T>(sql, params);
    },
    async withTransactionAsync(body) {
      database.exec('BEGIN');
      inTransaction = true;
      try {
        await body();
        database.exec('COMMIT');
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      } finally {
        inTransaction = false;
      }
      persist(database);
    },
  };
}

async function migrate(db: Db, raw: Database): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  for (let version = current; version < migrations.length; version++) {
    for (const statement of migrations[version]) {
      raw.exec(statement);
    }
    raw.exec(`PRAGMA user_version = ${version + 1}`);
  }
  persist(raw);
}

export function getDatabase(): Promise<Db> {
  if (instance) return Promise.resolve(instance);
  if (opening) return opening;

  opening = (async () => {
    const SQL = await initSqlJs({
      locateFile: () => 'https://sql.js.org/dist/sql-wasm.wasm',
    });
    const database = new SQL.Database(load());
    const db = wrap(database);

    await db.execAsync('PRAGMA foreign_keys = ON;');
    await migrate(db, database);
    await seedIfEmpty(db as never);
    persist(database);

    instance = db;
    return db;
  })();

  return opening;
}
