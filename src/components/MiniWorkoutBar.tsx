import { Pressable, StyleSheet, Text, View } from 'react-native';
import { mmss } from '../lib/format';
import { MINI_BAR_HEIGHT } from '../state/ActiveWorkout';
import { themed, useSheet } from '../theme/theme';
import { font, radius, spacing } from '../theme/tokens';

type Props = {
  title: string;
  /** "Supino reto", ou o estado do descanso quando há um de pé. */
  detail: string;
  seconds: number;
  /** Descansando: o número é o descanso, não o tempo de treino. */
  resting: boolean;
  /** Passou do alvo do descanso. */
  late: boolean;
  onPress: () => void;
};

/**
 * O treino reduzido a uma faixa, logo acima da tab bar.
 *
 * Existe para a pessoa conferir o calendário ou o progresso no meio da série
 * sem encerrar a sessão — antes era preciso sair do treino para mexer em
 * qualquer outra parte do app.
 */
export function MiniWorkoutBar({ title, detail, seconds, resting, late, onPress }: Props) {
  const styles = useSheet(sheets);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${detail}. Tocar para voltar ao treino`}
      style={styles.bar}
    >
      <View style={styles.labels}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {detail}
        </Text>
      </View>

      <Text style={[styles.clock, resting && styles.clockRest, late && styles.clockLate]}>
        {mmss(seconds)}
      </Text>
    </Pressable>
  );
}

const sheets = themed((colors) =>
  StyleSheet.create({
    bar: {
      height: MINI_BAR_HEIGHT,
      marginHorizontal: spacing.listGap,
      paddingHorizontal: 16,
      borderRadius: radius.card,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.neutral300,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      // Flutua sobre o conteúdo da tela: sem sombra ela se confunde com o
      // cartão que passa por baixo.
      shadowColor: '#000000',
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    labels: { flex: 1, gap: 2 },
    title: { fontFamily: font.semibold, fontSize: 15, lineHeight: 19, color: colors.textPrimary },
    detail: { fontFamily: font.regular, fontSize: 13, lineHeight: 17, color: colors.textSecondary },
    clock: {
      fontFamily: font.bold,
      fontSize: 20,
      lineHeight: 24,
      letterSpacing: -0.4,
      color: colors.textSecondary,
    },
    clockRest: { color: colors.green },
    clockLate: { color: colors.red },
  })
);
