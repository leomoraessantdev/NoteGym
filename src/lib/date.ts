const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const MONTHS_TITLE = MONTHS.map((m) => m[0].toUpperCase() + m.slice(1));

/** '2025-08-26' -> '26 de agosto' */
export function longDate(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${Number(day)} de ${MONTHS[Number(month) - 1]}`;
}

/** '2025-08-26' -> '26/08' */
export function shortDate(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}

export function monthName(month: number): string {
  return MONTHS[month];
}

export function monthTitle(month: number): string {
  return MONTHS_TITLE[month];
}

/** Data local -> 'YYYY-MM-DD'. Sem UTC: o dia do treino é o dia do usuário. */
export function isoDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Segunda = 0. É como a agenda é gravada no banco, então continua valendo
 * para saber qual treino cai em cada dia.
 */
export function mondayFirstWeekday(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** Domingo = 0. É a ordem que o calendário mostra: D S T Q Q S S. */
export function sundayFirstWeekday(date: Date): number {
  return date.getDay();
}

/** Domingo da semana da data, para agrupar volume por semana. */
export function startOfWeek(date: Date): Date {
  return shiftDays(date, -sundayFirstWeekday(date));
}

export function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}
