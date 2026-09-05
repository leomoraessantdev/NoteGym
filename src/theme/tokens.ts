/**
 * Design tokens do NoteGym.
 * Fonte: design_handoff_movyx/README.md — seguir a risca.
 *
 * As cores vêm em duas paletas com as mesmas chaves. Nenhum arquivo escolhe
 * uma delas: quem monta estilo recebe a paleta pronta por `themed`, em
 * `theme/theme.tsx`. Assim uma cor nova não pode entrar só no claro.
 */

export type Palette = {
  bg: string;
  surface: string;
  surfaceAlt: string;

  neutral100: string;
  neutral200: string;
  neutral300: string;
  neutral400: string;
  neutral500: string;

  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textDisabled: string;

  /** Verde de acento: texto, ícone, borda. Precisa ler sobre o fundo. */
  green: string;
  /**
   * Verde de superfície: barra de descanso, botão cheio, dia treinado.
   * Carrega texto branco por cima, então continua fundo nos dois temas.
   */
  greenSurface: string;
  greenHover: string;
  greenSoftBg: string;
  greenSoftText: string;
  greenMid: string;
  greenDeep: string;

  red: string;
  redSoftBg: string;

  checkIdle: string;
  overlay: string;

  /** Sobre o verde de superfície. */
  onGreen: string;
  onGreenMuted: string;
  onGreenSoft: string;
  onGreenLine: string;

  /** Número do dia de descanso no calendário. */
  dayRestText: string;
  /** Degrau entre greenMid e green, para as barras de volume da Início. */
  greenBar: string;
};

export const lightColors: Palette = {
  bg: '#F7F5F1',
  surface: '#FFFFFF',
  surfaceAlt: '#F4F1EB',

  neutral100: '#F1EEE8',
  neutral200: '#E9E5DE',
  neutral300: '#E7E3DC',
  neutral400: '#E4DFD6',
  neutral500: '#DCD6CC',

  textPrimary: '#1B1A18',
  textSecondary: '#7A756E',
  textTertiary: '#9A948B',
  textDisabled: '#B4AEA4',

  green: '#2E6B4E',
  greenSurface: '#2E6B4E',
  greenHover: '#356F52',
  greenSoftBg: '#EDF3EF',
  greenSoftText: '#5C7A69',
  greenMid: '#CFDDD4',
  greenDeep: '#2F4A3C',

  red: '#B4472F',
  redSoftBg: '#FBF0ED',

  checkIdle: '#C4BEB4',
  overlay: 'rgba(27,26,24,0.35)',

  onGreen: '#FFFFFF',
  onGreenMuted: 'rgba(255,255,255,0.75)',
  onGreenSoft: 'rgba(255,255,255,0.7)',
  onGreenLine: 'rgba(255,255,255,0.4)',

  dayRestText: '#A9A39A',
  greenBar: '#7FA891',
};

/**
 * Escuro quente, não cinza-azulado: o app é bege, e um preto neutro ao lado do
 * verde da marca fica com cara de outro produto.
 *
 * O acento clareia para ler sobre o fundo escuro, mas a superfície verde
 * continua funda — é ela que carrega texto branco, e verde claro atrás de
 * branco não teria contraste.
 */
export const darkColors: Palette = {
  bg: '#131211',
  surface: '#1D1B19',
  surfaceAlt: '#242220',

  neutral100: '#232120',
  neutral200: '#2A2724',
  neutral300: '#332F2B',
  neutral400: '#3B3733',
  neutral500: '#4B453F',

  textPrimary: '#F3F0EB',
  textSecondary: '#ABA49B',
  textTertiary: '#8B847B',
  textDisabled: '#6B655D',

  green: '#6FBF95',
  greenSurface: '#2E6B4E',
  greenHover: '#3A7C5C',
  greenSoftBg: '#1D2A23',
  greenSoftText: '#93BBA3',
  greenMid: '#2C4436',
  greenDeep: '#BCDCC9',

  red: '#E1795F',
  redSoftBg: '#2B1D19',

  checkIdle: '#4B453F',
  overlay: 'rgba(0,0,0,0.6)',

  onGreen: '#FFFFFF',
  onGreenMuted: 'rgba(255,255,255,0.75)',
  onGreenSoft: 'rgba(255,255,255,0.7)',
  onGreenLine: 'rgba(255,255,255,0.4)',

  dayRestText: '#6B655D',
  greenBar: '#3F7A5B',
};

/** Sombra unica de card: 0 2px 10px rgba(60,50,35,.05) */
export const cardShadow = '0px 2px 10px rgba(60,50,35,0.05)';
/** No escuro ela precisa ser mais densa para existir sobre o fundo. */
export const cardShadowDark = '0px 2px 10px rgba(0,0,0,0.3)';

export const font = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

/** letter-spacing do handoff vem em em; no React Native e px. */
export const tracking = (em: number, size: number) => em * size;

export const spacing = {
  screenX: 22,
  block: 24,
  listGap: 12,
} as const;

export const radius = {
  card: 22,
  cardLg: 26,
  sheet: 28,
  button: 18,
  input: 14,
  pill: 999,
} as const;

export const touch = {
  primaryButton: 60,
  secondaryButton: 56,
  stepper: 52,
  check: 52,
} as const;
