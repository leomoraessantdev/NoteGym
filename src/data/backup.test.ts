import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  BackupError,
  type BackupTables,
  backupFileName,
  describeBackup,
  parseBackup,
  serializeBackup,
} from './backup';

const EMPTY: BackupTables = {
  exercises: [],
  workouts: [],
  workout_exercises: [],
  sessions: [],
  session_sets: [],
  schedule: [],
  settings: [],
};

const FULL: BackupTables = {
  ...EMPTY,
  exercises: [{ id: 'supino', name: 'Supino', muscle_group: 'Peito', is_custom: 0 }],
  workouts: [{ id: 'w-a', letter: 'A', title: 'Peito', position: 0 }],
  sessions: [
    {
      id: 's-1',
      workout_id: 'w-a',
      day: '2026-09-05',
      started_at: '2026-09-05T19:00:00.000Z',
      finished_at: '2026-09-05T20:00:00.000Z',
    },
  ],
  session_sets: [
    {
      session_id: 's-1',
      exercise_id: 'supino',
      set_index: 0,
      kg: 40,
      reps: 10,
      logged_at: '2026-09-05T19:10:00.000Z',
    },
  ],
};

const AT = '2026-09-05T21:00:00.000Z';
const reparse = (mutate: (data: any) => void) => {
  const data = JSON.parse(serializeBackup(FULL, AT));
  mutate(data);
  return () => parseBackup(JSON.stringify(data));
};

describe('formato do backup', () => {
  it('ida e volta preserva o conteudo', () => {
    const back = parseBackup(serializeBackup(FULL, AT));
    expect(back.format).toBe(BACKUP_FORMAT);
    expect(back.version).toBe(BACKUP_VERSION);
    expect(back.exportedAt).toBe(AT);
    expect(back.session_sets[0].kg).toBe(40);
    expect(back.sessions[0].day).toBe('2026-09-05');
    expect(back.sessions[0].finished_at).toBe('2026-09-05T20:00:00.000Z');
  });

  it('o nome do arquivo leva a data na frente', () => {
    expect(backupFileName(AT)).toBe('notegym-2026-09-05.json');
  });

  it('recusa arquivo que nao e JSON', () => {
    expect(() => parseBackup('isto nao e json')).toThrow(BackupError);
  });

  it('recusa JSON de outro app', () => {
    expect(() => parseBackup(JSON.stringify({ hello: 'world' }))).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify([1, 2, 3]))).toThrow(BackupError);
  });

  it('recusa backup de uma versao mais nova', () => {
    expect(reparse((d) => (d.version = BACKUP_VERSION + 1))).toThrow(/mais nova/);
  });

  it('recusa arquivo a que falta uma tabela', () => {
    expect(reparse((d) => delete d.session_sets)).toThrow(/session_sets/);
  });

  it('recusa tabela que nao e lista de registros', () => {
    expect(reparse((d) => (d.sessions = 'nao sou uma lista'))).toThrow(/sessions/);
    expect(reparse((d) => (d.sessions = [['nao', 'sou', 'registro']]))).toThrow(/sessions/);
    expect(reparse((d) => (d.sessions = [null]))).toThrow(/sessions/);
  });

  it('recusa valor aninhado numa linha, antes de encostar no banco', () => {
    expect(reparse((d) => (d.sessions[0].workout_id = { id: 'w-a' }))).toThrow(/sessions/);
    expect(reparse((d) => (d.session_sets[0].kg = [40]))).toThrow(/session_sets/);
  });

  it('aceita backup vazio: quem nunca treinou tambem faz copia', () => {
    expect(parseBackup(serializeBackup(EMPTY, AT)).sessions).toEqual([]);
  });

  it('descreve o que vai ser restaurado', () => {
    const back = parseBackup(serializeBackup(FULL, AT));
    expect(describeBackup(back)).toContain('1 treino');
    expect(describeBackup(back)).toContain('1 dia registrado');
    const vazio = parseBackup(serializeBackup(EMPTY, AT));
    expect(describeBackup(vazio)).toContain('0 treinos');
  });
});
