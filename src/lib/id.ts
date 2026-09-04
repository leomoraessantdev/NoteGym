/**
 * Identificador de linha nova.
 *
 * Só o relógio não basta: duplicar um treino ou criar dois exercícios seguidos
 * cabe no mesmo milissegundo, e aí o INSERT esbarra na chave primária. O sufixo
 * aleatório separa os empates.
 */
export function newId(prefix: string): string {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${time}-${random}`;
}
