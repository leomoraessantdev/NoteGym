import {
  daysBetween,
  elapsedWeeks,
  isoDay,
  mondayFirstWeekday,
  shiftDays,
  startOfWeek,
  sundayFirstWeekday,
} from './date';

/** Setembro de 2026: dia 6 e domingo, 12 e sabado. */
const sunday = new Date(2026, 8, 6);
const wednesday = new Date(2026, 8, 9);
const saturday = new Date(2026, 8, 12);

describe('datas', () => {
  it('isoDay usa o dia local, nao UTC', () => {
    expect(isoDay(new Date(2026, 8, 6, 23, 30))).toBe('2026-09-06');
    expect(isoDay(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
  });

  it('a agenda conta segunda como 0 e o calendario conta domingo como 0', () => {
    expect(mondayFirstWeekday(sunday)).toBe(6);
    expect(sundayFirstWeekday(sunday)).toBe(0);
    expect(mondayFirstWeekday(saturday)).toBe(5);
    expect(sundayFirstWeekday(saturday)).toBe(6);
  });

  it('a semana comeca no domingo', () => {
    expect(isoDay(startOfWeek(wednesday))).toBe('2026-09-06');
    expect(isoDay(startOfWeek(sunday))).toBe('2026-09-06');
    expect(isoDay(startOfWeek(saturday))).toBe('2026-09-06');
  });

  it('shiftDays atravessa a virada do mes', () => {
    expect(isoDay(shiftDays(new Date(2026, 8, 30), 1))).toBe('2026-10-01');
    expect(isoDay(shiftDays(new Date(2026, 8, 1), -1))).toBe('2026-08-31');
  });

  it('daysBetween conta dias inteiros', () => {
    expect(daysBetween('2026-09-06', '2026-09-12')).toBe(6);
    expect(daysBetween('2026-09-12', '2026-09-06')).toBe(-6);
  });
});

describe('janela de constancia', () => {
  it('no domingo a semana corrente vale so um dia', () => {
    expect(elapsedWeeks(4, sunday)).toBeCloseTo(3 + 1 / 7, 6);
  });

  it('no sabado ela vale a semana inteira', () => {
    expect(elapsedWeeks(4, saturday)).toBe(4);
  });

  it('cresce ao longo da semana em vez de saltar', () => {
    expect(elapsedWeeks(4, sunday)).toBeLessThan(elapsedWeeks(4, wednesday));
    expect(elapsedWeeks(4, wednesday)).toBeLessThan(elapsedWeeks(4, saturday));
  });

  it('nunca divide por zero', () => {
    expect(elapsedWeeks(1, sunday)).toBeCloseTo(1 / 7, 6);
    expect(elapsedWeeks(0, sunday)).toBeGreaterThan(0);
  });

  it('quatro treinos em quatro semanas fecham em um por semana', () => {
    expect(4 / elapsedWeeks(4, saturday)).toBe(1);
    // E no comeco da janela a media aparece maior, que e o correto.
    expect(4 / elapsedWeeks(4, sunday)).toBeGreaterThan(1);
  });
});
