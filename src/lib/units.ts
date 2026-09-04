/**
 * Unidade de peso.
 *
 * O banco guarda sempre quilos — é a única forma de o histórico continuar
 * comparável quando a pessoa troca a unidade no meio do caminho. A conversão
 * acontece só na borda: ao mostrar um número e ao mexer num stepper.
 */
const LB_PER_KG = 2.2046226218;

export const KG = 'kg';
export const LB = 'lb';

/** Meio em meio: mata o resto da conversão sem inventar precisão. */
export function roundHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

/** Quilos guardados -> número na unidade do usuário. */
export function toDisplay(kg: number, unit: string): number {
  return unit === LB ? kg * LB_PER_KG : kg;
}

/** Número na unidade do usuário -> quilos, para gravar. */
export function toKg(value: number, unit: string): number {
  return unit === LB ? value / LB_PER_KG : value;
}

/** Passo do stepper na unidade do usuário: 2,5 kg ou 5 lb, como nas anilhas. */
export function stepFor(unit: string): number {
  return unit === LB ? 5 : 2.5;
}

/**
 * Próxima carga ao tocar + ou −.
 *
 * O passo é dado sobre o valor que está na tela, não sobre os quilos crus:
 * assim quem usa libras anda de 5 em 5 redondos, e quem usa quilos vê
 * exatamente o mesmo comportamento de antes.
 */
export function stepWeight(kg: number, direction: number, unit: string): number {
  const step = stepFor(unit);
  const shown = roundHalf(toDisplay(kg, unit));
  const moved = Math.max(0, shown + step * Math.sign(direction));
  return toKg(moved, unit);
}
