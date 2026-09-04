/**
 * Design tokens do NoteGym.
 * Fonte: design_handoff_movyx/README.md — seguir a risca.
 */

export const colors = {
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
  greenHover: '#356F52',
  greenSoftBg: '#EDF3EF',
  greenSoftText: '#5C7A69',
  greenMid: '#CFDDD4',
  greenDeep: '#2F4A3C',

  red: '#B4472F',
  redSoftBg: '#FBF0ED',

  checkIdle: '#C4BEB4',
  overlay: 'rgba(27,26,24,0.35)',

  /** Sobre o verde cheio: barra de descanso, tela de descanso, dia treinado. */
  onGreen: '#FFFFFF',
  onGreenMuted: 'rgba(255,255,255,0.75)',
  onGreenSoft: 'rgba(255,255,255,0.7)',
  onGreenLine: 'rgba(255,255,255,0.4)',

  /** Número do dia de descanso no calendário. */
  dayRestText: '#A9A39A',
  /** Degrau entre greenMid e green, para as barras de volume da Início. */
  greenBar: '#7FA891',
} as const;

/** Sombra unica de card: 0 2px 10px rgba(60,50,35,.05) */
export const cardShadow = '0px 2px 10px rgba(60,50,35,0.05)';

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
