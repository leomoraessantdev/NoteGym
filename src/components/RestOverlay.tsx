import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mmss } from '../lib/format';
import { useResponsive } from '../theme/layout';
import { themed, useSheet } from '../theme/theme';
import { font, radius } from '../theme/tokens';
import { typeSheets } from '../theme/type';

type Props = {
  visible: boolean;
  seconds: number;
  paused: boolean;
  /** "série 4, 40,5 kg" — o que vem depois. */
  nextLabel: string;
  onTogglePause: () => void;
  onAddThirty: () => void;
  onSkip: () => void;
  onCollapse: () => void;
};

/**
 * Descanso em tela cheia — a versão ampliada da barra.
 *
 * Não tem cronômetro próprio: recebe o tempo de quem controla, para os dois
 * formatos nunca mostrarem números diferentes.
 */
export function RestOverlay({
  visible,
  seconds,
  paused,
  nextLabel,
  onTogglePause,
  onAddThirty,
  onSkip,
  onCollapse,
}: Props) {
  const styles = useSheet(sheets);
  const type = useSheet(typeSheets);
  const insets = useSafeAreaInsets();
  const { fs } = useResponsive();

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onCollapse}>
      <View
        style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
      >
        <Pressable
          onPress={onCollapse}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Reduzir o descanso"
          style={styles.collapse}
        >
          <Text style={styles.collapseLabel}>Reduzir</Text>
        </Pressable>

        <View style={styles.center}>
          <Text style={styles.label}>{paused ? 'Descanso pausado' : 'Descanso'}</Text>
          <Text style={[type.restClock, { fontSize: fs(86), lineHeight: fs(96) }]}>
            {mmss(seconds)}
          </Text>
          <Text style={styles.next}>Depois: {nextLabel}</Text>
        </View>

        <View style={styles.actions}>
          <View style={styles.buttonRow}>
            <Pressable
              onPress={onTogglePause}
              accessibilityRole="button"
              style={[styles.button, styles.ghost]}
            >
              <Text style={[styles.buttonLabel, styles.ghostLabel]}>
                {paused ? 'Retomar' : 'Pausar'}
              </Text>
            </Pressable>
            <Pressable
              onPress={onSkip}
              accessibilityRole="button"
              style={[styles.button, styles.solid]}
            >
              <Text style={[styles.buttonLabel, styles.solidLabel]}>Pular</Text>
            </Pressable>
          </View>

          <Pressable onPress={onAddThirty} accessibilityRole="button" hitSlop={10}>
            <Text style={styles.link}>mais 30 segundos</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const sheets = themed((colors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.greenSurface,
      paddingHorizontal: 22,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 34,
    },
    collapse: { position: 'absolute', top: 0, right: 0, padding: 22 },
    collapseLabel: {
      fontFamily: font.medium,
      fontSize: 15,
      lineHeight: 20,
      color: colors.onGreenMuted,
    },
    center: { alignItems: 'center', gap: 20 },
    label: {
      fontFamily: font.medium,
      fontSize: 17,
      lineHeight: 22,
      color: colors.onGreenSoft,
    },
    next: {
      fontFamily: font.regular,
      fontSize: 15,
      lineHeight: 20,
      color: colors.onGreenMuted,
    },
    actions: { gap: 18, alignItems: 'center', alignSelf: 'stretch' },
    buttonRow: { flexDirection: 'row', gap: 12, maxWidth: 296, width: '100%', alignSelf: 'center' },
    button: {
      flex: 1,
      height: 58,
      borderRadius: radius.button,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ghost: { borderWidth: 1.5, borderColor: colors.onGreenLine },
    solid: { backgroundColor: colors.onGreen },
    buttonLabel: { fontFamily: font.semibold, fontSize: 16, lineHeight: 21 },
    ghostLabel: { color: colors.onGreen },
    solidLabel: { color: colors.greenSurface },
    link: {
      fontFamily: font.medium,
      fontSize: 14,
      lineHeight: 18,
      color: colors.onGreenSoft,
    },
  })
);
