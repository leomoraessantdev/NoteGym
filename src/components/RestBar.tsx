import { Pressable, StyleSheet, Text, View } from 'react-native';
import { mmss } from '../lib/format';
import { colors, font, radius } from '../theme/tokens';

type Props = {
  seconds: number;
  paused: boolean;
  /** "série 3, 40 kg" — o que vem depois do descanso. */
  nextLabel: string;
  onTogglePause: () => void;
  onSkip: () => void;
  onExpand: () => void;
};

/**
 * Descanso em barra, não em tela cheia.
 *
 * O cronômetro segue à vista enquanto a pessoa confere a próxima série ou
 * corrige a anterior. Tocar na barra abre a versão grande.
 */
export function RestBar({ seconds, paused, nextLabel, onTogglePause, onSkip, onExpand }: Props) {
  return (
    <View style={styles.bar}>
      {/* Expandir e as ações são alvos irmãos: nada de toque dentro de toque. */}
      <Pressable
        onPress={onExpand}
        accessibilityRole="button"
        accessibilityLabel={`Descanso, ${mmss(seconds)}. Tocar para ampliar`}
        style={styles.left}
      >
        <Text style={styles.clock}>{mmss(seconds)}</Text>
        <View style={styles.labels}>
          <Text style={styles.title}>{paused ? 'Descanso pausado' : 'Descanso'}</Text>
          <Text style={styles.next} numberOfLines={1}>
            Depois: {nextLabel}
          </Text>
        </View>
      </Pressable>

      <View style={styles.actions}>
        <Pressable
          onPress={onTogglePause}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={paused ? 'Retomar descanso' : 'Pausar descanso'}
          style={styles.action}
        >
          <Text style={styles.actionLabel}>{paused ? 'Retomar' : 'Pausar'}</Text>
        </Pressable>
        <Pressable
          onPress={onSkip}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Pular descanso"
          style={[styles.action, styles.actionSolid]}
        >
          <Text style={[styles.actionLabel, styles.actionLabelSolid]}>Pular</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.green,
    borderRadius: radius.card,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  left: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  clock: {
    fontFamily: font.bold,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.6,
    color: colors.onGreen,
    minWidth: 56,
  },
  labels: { flexShrink: 1, gap: 2 },
  title: { fontFamily: font.semibold, fontSize: 13, lineHeight: 17, color: '#FFFFFF' },
  next: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onGreenMuted,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  action: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.onGreenLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSolid: { backgroundColor: colors.onGreen, borderColor: colors.onGreen },
  actionLabel: { fontFamily: font.semibold, fontSize: 13, lineHeight: 17, color: '#FFFFFF' },
  actionLabelSolid: { color: colors.green },
});
