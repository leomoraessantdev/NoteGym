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

/** "35 kg × 10" — a unidade vem das configurações do usuário. */
export function setLabel(kg: number, reps: number, unit = 'kg'): string {
  return `${br(kg)} ${unit} × ${reps}`;
}

/** "1 exercício" / "5 exercícios" — evita o "1 exercícios". */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}
