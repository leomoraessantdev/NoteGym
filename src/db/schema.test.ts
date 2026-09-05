/**
 * @jest-environment node
 */
import initSqlJs, { type Database } from 'sql.js';
import { migrations } from './schema';

/** Aplica as migracoes como o app aplica: em ordem, cada uma numa transacao. */
async function migrated(): Promise<Database> {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.exec('PRAGMA foreign_keys = ON;');
  migrations.forEach((statements, index) => {
    db.exec('BEGIN');
    for (const statement of statements) db.exec(statement);
    db.exec('PRAGMA user_version = ' + (index + 1));
    db.exec('COMMIT');
  });
  return db;
}

/** Banco parado na versao 2, para exercitar a limpeza da migracao 3. */
async function beforeCleanup(): Promise<Database> {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.exec('PRAGMA foreign_keys = ON;');
  for (const statement of [...migrations[0], ...migrations[1]]) db.exec(statement);
  db.exec("INSERT INTO exercises (id,name,muscle_group,is_custom) VALUES ('supino','Supino','Peito',0)");
  db.exec("INSERT INTO workouts VALUES ('w-a','A','Peito',0)");
  return db;
}

const rows = (db: Database, sql: string) => {
  const out = db.exec(sql);
  return out.length ? out[0].values : [];
};

describe('migracoes', () => {
  it('aplicam em ordem e deixam user_version igual a quantidade', async () => {
    const db = await migrated();
    expect(rows(db, 'PRAGMA user_version')[0][0]).toBe(migrations.length);
    db.close();
  });

  it('criam as tabelas que a camada de dados usa', async () => {
    const db = await migrated();
    const names = rows(db, "SELECT name FROM sqlite_master WHERE type='table'").map((r) => r[0]);
    for (const table of [
      'exercises',
      'workouts',
      'workout_exercises',
      'sessions',
      'session_sets',
      'settings',
      'schedule',
    ]) {
      expect(names).toContain(table);
    }
    db.close();
  });

  it('apagam o historico de exemplo e poupam o que o usuario registrou', async () => {
    const db = await beforeCleanup();
    db.exec("INSERT INTO sessions VALUES ('seed-26','w-a','2026-08-09','2026-08-09T19:00:00.000Z','2026-08-09T19:52:00.000Z')");
    db.exec("INSERT INTO session_sets (session_id,exercise_id,set_index,kg,reps,logged_at) VALUES ('seed-26','supino',0,28,10,'2026-08-09T19:00:00.000Z')");
    db.exec("INSERT INTO sessions VALUES ('s-real','w-a','2026-09-03','2026-09-03T19:00:00.000Z',NULL)");
    db.exec("INSERT INTO session_sets (session_id,exercise_id,set_index,kg,reps,logged_at) VALUES ('s-real','supino',0,40,10,'2026-09-03T19:10:00.000Z')");
    db.exec("INSERT INTO settings VALUES ('account_email','leonardo@notegym.app')");
    db.exec("INSERT INTO settings VALUES ('profile_name','Leonardo')");

    for (const statement of migrations[2]) db.exec(statement);

    expect(rows(db, 'SELECT id FROM sessions').map((r) => r[0])).toEqual(['s-real']);
    expect(rows(db, 'SELECT session_id FROM session_sets').map((r) => r[0])).toEqual(['s-real']);
    expect(rows(db, "SELECT value FROM settings WHERE key='account_email'")[0][0]).toBe('');
    // O nome fica: quem ja usava pode ter adotado o que estava la.
    expect(rows(db, "SELECT value FROM settings WHERE key='profile_name'")[0][0]).toBe('Leonardo');
    db.close();
  });

  it('colapsam exercicios repetidos no mesmo treino e travam a regra', async () => {
    const db = await beforeCleanup();
    db.exec("INSERT INTO workout_exercises (workout_id,exercise_id,target_sets,rep_min,rep_max,position) VALUES ('w-a','supino',3,8,10,0),('w-a','supino',3,8,10,1)");

    for (const statement of migrations[2]) db.exec(statement);

    expect(rows(db, 'SELECT COUNT(*) FROM workout_exercises')[0][0]).toBe(1);
    expect(() =>
      db.exec("INSERT INTO workout_exercises (workout_id,exercise_id,target_sets,rep_min,rep_max,position) VALUES ('w-a','supino',3,8,10,9)")
    ).toThrow();
    db.close();
  });
});
