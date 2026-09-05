/**
 * Formato do backup.
 *
 * O histórico mora só neste aparelho. Perdeu o celular, perdeu tudo — a cópia
 * é a única rede. O arquivo é JSON legível de propósito: daqui a dois anos a
 * pessoa tem de conseguir abrir e entender o que está lá, mesmo que o app não
 * exista mais.
 *
 * A leitura é rigorosa porque o passo seguinte apaga o banco: um arquivo
 * estranho tem de ser recusado antes, nunca no meio da restauração.
 */
export const BACKUP_FORMAT = 'notegym-backup';
export const BACKUP_VERSION = 1;

export type BackupTables = {
  exercises: { id: string; name: string; muscle_group: string; is_custom: number }[];
  workouts: { id: string; letter: string; title: string; position: number }[];
  workout_exercises: {
    workout_id: string;
    exercise_id: string;
    target_sets: number;
    rep_min: number;
    rep_max: number;
    position: number;
  }[];
  sessions: {
    id: string;
    workout_id: string | null;
    day: string;
    started_at: string;
    finished_at: string | null;
  }[];
  session_sets: {
    session_id: string;
    exercise_id: string;
    set_index: number;
    kg: number;
    reps: number;
    logged_at: string;
  }[];
  schedule: { weekday: number; workout_id: string }[];
  settings: { key: string; value: string }[];
};

export type Backup = BackupTables & {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
};

/** Ordem de dependência: pais antes de filhos. */
export const TABLE_NAMES: (keyof BackupTables)[] = [
  'exercises',
  'workouts',
  'workout_exercises',
  'sessions',
  'session_sets',
  'schedule',
  'settings',
];

/** Erro de leitura do arquivo, com texto que cabe na tela. */
export class BackupError extends Error {}

export function serializeBackup(tables: BackupTables, exportedAt: string): string {
  const backup: Backup = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt,
    ...tables,
  };
  return JSON.stringify(backup, null, 2);
}

/** Nome do arquivo com a data na frente, para a lista ficar em ordem. */
export function backupFileName(exportedAt: string): string {
  return 'notegym-' + exportedAt.slice(0, 10) + '.json';
}

/** O que uma coluna do SQLite aceita receber. */
export type Cell = string | number | null;

const isCell = (value: unknown): value is Cell =>
  value === null || typeof value === 'string' || typeof value === 'number';

/**
 * Linha de tabela: objeto simples de valores primitivos.
 *
 * A exigência de primitivo não é preciosismo. A restauração apaga o banco
 * antes de inserir; um valor aninhado só estouraria lá dentro, com o histórico
 * já no chão. Melhor recusar o arquivo enquanto não se perdeu nada.
 */
function isRowArray(value: unknown): value is Record<string, Cell>[] {
  return (
    Array.isArray(value) &&
    value.every(
      (row) =>
        typeof row === 'object' &&
        row !== null &&
        !Array.isArray(row) &&
        Object.values(row as Record<string, unknown>).every(isCell)
    )
  );
}

/**
 * Lê e confere o arquivo. Devolve o backup ou estoura com uma frase que a tela
 * pode mostrar — nunca um objeto pela metade.
 */
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('Este arquivo não é um backup do NoteGym.');
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new BackupError('Este arquivo não é um backup do NoteGym.');
  }

  const data = raw as Record<string, unknown>;
  if (data.format !== BACKUP_FORMAT) {
    throw new BackupError('Este arquivo não é um backup do NoteGym.');
  }
  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION) {
    throw new BackupError('Este backup vem de uma versão mais nova do app.');
  }

  for (const table of TABLE_NAMES) {
    if (!isRowArray(data[table])) {
      throw new BackupError('O arquivo está incompleto: falta ' + table + '.');
    }
  }

  return data as unknown as Backup;
}

/** Uma linha para a tela: o que exatamente vai ser restaurado. */
export function describeBackup(backup: Backup): string {
  const days = new Set(backup.sessions.map((s) => s.day)).size;
  const sets = backup.session_sets.length;
  const workouts = backup.workouts.length;
  return (
    workouts +
    (workouts === 1 ? ' treino' : ' treinos') +
    ', ' +
    days +
    (days === 1 ? ' dia registrado' : ' dias registrados') +
    ', ' +
    sets +
    (sets === 1 ? ' série' : ' séries') +
    '.'
  );
}
