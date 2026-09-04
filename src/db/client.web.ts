import initSqlJs, { type Database } from 'sql.js';
import { migrations } from './schema';
import { seedIfEmpty, seedScheduleIfEmpty } from './seed';

/**
 * Driver de banco do preview web.
 *
 * O `expo-sqlite` no navegador depende de OPFS num worker, que não sobe no
 * servidor de desenvolvimento. Aqui o mesmo SQL roda em sql.js e os bytes do
 * arquivo ficam no localStorage. No Android e no iOS vale `client.ts`, com
 * SQLite nativo — o SQL e as migrações são exatamente os mesmos.
 */
const STORAGE_KEY = 'notegym.db';

/**
 * Precisa bater com a versão de `sql.js` no package.json. Sem o número, a URL
 * serve sempre a última publicada e o preview passa a rodar num motor que
 * ninguém escolheu.
 */
const SQL_JS_VERSION = '1.14.2';

/** Gravações seguidas viram uma só. O arquivo inteiro vai para o localStorage
 *  a cada persistência, e uma série marcada dispara várias escritas. */
const PERSIST_DELAY_MS = 250;

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
  let pending: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (pending !== null) {
      clearTimeout(pending);
      pending = null;
    }
    persist(database);
  };

  const save = () => {
    if (inTransaction) return;
    if (pending !== null) clearTimeout(pending);
    pending = setTimeout(() => {
      pending = null;
      persist(database);
    }, PERSIST_DELAY_MS);
  };

  // Fechar a aba não pode levar junto o que ainda não desceu.
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
  }

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
      flush();
    },
  };
}

async function migrate(db: Db, raw: Database): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  for (let version = current; version < migrations.length; version++) {
    // Mesma garantia do nativo: os comandos e a nova versão entram juntos, ou
    // nada entra. Meia migração gravada quebraria a abertura seguinte.
    raw.exec('BEGIN');
    try {
      for (const statement of migrations[version]) {
        raw.exec(statement);
      }
      raw.exec(`PRAGMA user_version = ${version + 1}`);
      raw.exec('COMMIT');
    } catch (error) {
      raw.exec('ROLLBACK');
      throw error;
    }
  }
  persist(raw);
}

export function getDatabase(): Promise<Db> {
  if (instance) return Promise.resolve(instance);
  if (opening) return opening;

  opening = (async () => {
    const SQL = await initSqlJs({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/sql.js@${SQL_JS_VERSION}/dist/${file}`,
    });
    const database = new SQL.Database(load());
    const db = wrap(database);

    await db.execAsync('PRAGMA foreign_keys = ON;');
    await migrate(db, database);
    await seedIfEmpty(db as never);
    await seedScheduleIfEmpty(db as never);
    persist(database);

    instance = db;
    return db;
  })();

  return opening;
}
