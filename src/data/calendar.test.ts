import { buildMonth, isRestDay, weekdayOf, workoutIdOfDay } from './calendar';
import { isoDay } from '../lib/date';

/** Segunda a sexta com treino; sabado e domingo livres. 0 = segunda. */
const WEEK: Record<number, string> = { 0: 'w-a', 1: 'w-b', 2: 'w-c', 3: 'w-a', 4: 'w-b' };

describe('calendario', () => {
  it('le o dia da semana como a agenda grava (segunda = 0)', () => {
    expect(weekdayOf('2026-09-07')).toBe(0);
    expect(weekdayOf('2026-09-05')).toBe(5);
    expect(weekdayOf('2026-09-06')).toBe(6);
  });

  it('descanso e o dia sem treino, e nao existe no modo sequencia', () => {
    expect(isRestDay('2026-09-06', 'fixed', WEEK)).toBe(true);
    expect(isRestDay('2026-09-07', 'fixed', WEEK)).toBe(false);
    expect(isRestDay('2026-09-06', 'seq', WEEK)).toBe(false);
  });

  it('no modo fixo o treino do dia sai da agenda', () => {
    expect(workoutIdOfDay('2026-09-07', 'fixed', WEEK, ['w-a', 'w-b', 'w-c'], 99)).toBe('w-a');
    expect(workoutIdOfDay('2026-09-06', 'fixed', WEEK, ['w-a', 'w-b', 'w-c'], 0)).toBe(null);
  });

  it('no modo sequencia a ordem avanca a cada dia treinado', () => {
    const ids = ['w-a', 'w-b', 'w-c'];
    expect(workoutIdOfDay('2026-09-06', 'seq', {}, ids, 0)).toBe('w-a');
    expect(workoutIdOfDay('2026-09-06', 'seq', {}, ids, 1)).toBe('w-b');
    expect(workoutIdOfDay('2026-09-06', 'seq', {}, ids, 3)).toBe('w-a');
  });

  it('sem treino nenhum nao inventa dia cheio', () => {
    expect(workoutIdOfDay('2026-09-07', 'seq', {}, [], 0)).toBe(null);
  });

  it('monta o mes com as casas vazias antes do dia 1', () => {
    const cells = buildMonth(2026, 8, new Set(), 'fixed', WEEK);
    expect(cells.filter((c) => c.day === null)).toHaveLength(2);
    expect(cells.filter((c) => c.day !== null)).toHaveLength(30);
    expect(cells.find((c) => c.day === 1)?.iso).toBe('2026-09-01');
  });

  it('dia treinado ganha o estado done mesmo caindo em descanso', () => {
    const cells = buildMonth(2026, 8, new Set(['2026-09-06']), 'fixed', WEEK);
    expect(cells.find((c) => c.iso === '2026-09-06')?.state).toBe('done');
  });

  it('hoje e today quando ainda nao foi treinado', () => {
    const now = new Date();
    const cells = buildMonth(now.getFullYear(), now.getMonth(), new Set(), 'seq', {});
    expect(cells.find((c) => c.iso === isoDay(now))?.state).toBe('today');
  });
});
