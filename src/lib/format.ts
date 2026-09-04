import { KG, roundHalf, toDisplay } from './units';

/** Interface é pt-BR: decimal com vírgula (37,5 kg). */
export function br(value: number): string {
  return String(value).replace('.', ',');
}

/** Segundos -> m:ss */
export function mmss(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Carga guardada em quilos, escrita na unidade do usuário — só o número.
 * Toda tela que mostra peso passa por aqui: é o que impede um "100 lb" que na
 * verdade são 100 kg.
 */
export function weightValue(kg: number, unit: string = KG): string {
  return br(roundHalf(toDisplay(kg, unit)));
}

/** "37,5 kg" */
export function weight(kg: number, unit: string = KG): string {
  return `${weightValue(kg, unit)} ${unit}`;
}

/** Diferença entre duas cargas, já com o sinal: "+2,5 kg", "−5 lb". */
export function weightDelta(deltaKg: number, unit: string = KG): string {
  const shown = roundHalf(toDisplay(Math.abs(deltaKg), unit));
  return `${deltaKg < 0 ? '−' : '+'}${br(shown)} ${unit}`;
}

/** "35 kg × 10" — a unidade vem das configurações do usuário. */
export function setLabel(kg: number, reps: number, unit: string = KG): string {
  return `${weight(kg, unit)} × ${reps}`;
}

/**
 * Volume da sessão ou da semana: carga × repetições, somado. Números grandes
 * em pt-BR (12.480 kg) e na mesma unidade das cargas.
 */
export function volumeLabel(volumeKg: number, unit: string = KG): string {
  return `${Math.round(toDisplay(volumeKg, unit)).toLocaleString('pt-BR')} ${unit}`;
}

/** "1 exercício" / "5 exercícios" — evita o "1 exercícios". */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}
