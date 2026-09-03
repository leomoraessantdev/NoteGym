import { TextStyle } from 'react-native';
import { colors, font, tracking } from './tokens';

/** Papeis tipograficos do handoff. line-height e letter-spacing ja em px. */
export const type = {
  /** Titulo de destaque — nome do exercicio. 700 / 34 / 1.05 / -.03em */
  display: {
    fontFamily: font.bold,
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: tracking(-0.03, 34),
    color: colors.textPrimary,
  },
  /** Titulo de tela. 600 / 24 / 1.2 / -.02em */
  screenTitle: {
    fontFamily: font.semibold,
    fontSize: 24,
    lineHeight: 29,
    letterSpacing: tracking(-0.02, 24),
    color: colors.textPrimary,
  },
  /** Titulo de card. 600 / 16-17 */
  cardTitle: {
    fontFamily: font.semibold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  cardTitleLg: {
    fontFamily: font.semibold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  /** Corpo. 400 / 15 */
  body: {
    fontFamily: font.regular,
    fontSize: 15,
    color: colors.textPrimary,
  },
  bodyMuted: {
    fontFamily: font.regular,
    fontSize: 15,
    color: colors.textSecondary,
  },
  paragraph: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  /** Metadado. 400 / 13-14, secundario ou terciario */
  meta: {
    fontFamily: font.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  metaSmall: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.textTertiary,
  },
  /** Valor numerico de serie. 700 / 20 */
  setValue: {
    fontFamily: font.bold,
    fontSize: 20,
    color: colors.textPrimary,
  },
  unit: {
    fontFamily: font.regular,
    fontSize: 12,
    color: colors.textTertiary,
  },
  /** Cronometro de descanso. 700 / 86 / -.04em */
  restClock: {
    fontFamily: font.bold,
    fontSize: 86,
    letterSpacing: tracking(-0.04, 86),
    color: '#FFFFFF',
  },
} satisfies Record<string, TextStyle>;
