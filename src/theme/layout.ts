import { useWindowDimensions } from 'react-native';

/** Largura de referência do handoff. */
export const BASE_WIDTH = 390;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Escala suave para tipografia grande. O layout em si é fluido (flex/%), então
 * só os tamanhos que estouram em telas pequenas passam por aqui.
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const scale = clamp(width / BASE_WIDTH, 0.86, 1.14);

  return {
    width,
    height,
    scale,
    /** Arredonda para meio pixel — evita blur em texto grande. */
    fs: (size: number) => Math.round(size * scale * 2) / 2,
    /** Telas curtas ganham blocos mais apertados. */
    compact: height < 700,
  };
}
