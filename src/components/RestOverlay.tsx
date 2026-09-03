import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mmss } from '../lib/format';
import { colors, font, radius } from '../theme/tokens';
import { useResponsive } from '../theme/layout';
import { type } from '../theme/type';

type Props = {
  visible: boolean;
  /** Duração do descanso em segundos. */
  duration: number;
  /** "série 4, 40,5 kg" — o que vem depois. */
  nextLabel: string;
  onFinish: () => void;
};

/**
 * Overlay de descanso em tela cheia.
 * A contagem vive aqui dentro: a tela de execução não re-renderiza a cada segundo.
 */
export function RestOverlay({ visible, duration, nextLabel, onFinish }: Props) {
  const insets = useSafeAreaInsets();
  const { fs } = useResponsive();
  const [remaining, setRemaining] = useState(duration);
  const [paused, setPaused] = useState(false);
  const deadline = useRef(0);

  // Cada abertura reinicia a contagem.
  useEffect(() => {
    if (!visible) return;
    setRemaining(duration);
    setPaused(false);
    deadline.current = Date.now() + duration * 1000;
  }, [visible, duration]);

  useEffect(() => {
    if (!visible || paused) return;
    const id = setInterval(() => {
      const left = Math.round((deadline.current - Date.now()) / 1000);
      if (left <= 0) {
        clearInterval(id);
        onFinish();
      } else {
        setRemaining(left);
      }
    }, 250);
    return () => clearInterval(id);
  }, [visible, paused, onFinish]);

  const togglePause = useCallback(() => {
    setPaused((wasPaused) => {
      if (wasPaused) deadline.current = Date.now() + remaining * 1000;
      return !wasPaused;
    });
  }, [remaining]);

  const addThirty = useCallback(() => {
    deadline.current += 30_000;
    setRemaining((r) => r + 30);
  }, []);

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onFinish}>
      <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.center}>
          <Text style={styles.label}>Descanso</Text>
          <Text style={[type.restClock, { fontSize: fs(86), lineHeight: fs(96) }]}>
            {mmss(remaining)}
          </Text>
          <Text style={styles.next}>Depois: {nextLabel}</Text>
        </View>

        <View style={styles.actions}>
          <View style={styles.buttonRow}>
            <Pressable
              onPress={togglePause}
              accessibilityRole="button"
              style={[styles.button, styles.ghost]}
            >
              <Text style={[styles.buttonLabel, styles.ghostLabel]}>
                {paused ? 'Retomar' : 'Pausar'}
              </Text>
            </Pressable>
            <Pressable
              onPress={onFinish}
              accessibilityRole="button"
              style={[styles.button, styles.solid]}
            >
              <Text style={[styles.buttonLabel, styles.solidLabel]}>Pular</Text>
            </Pressable>
          </View>

          <Pressable onPress={addThirty} accessibilityRole="button" hitSlop={10}>
            <Text style={styles.link}>mais 30 segundos</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.green,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 34,
  },
  center: {
    alignItems: 'center',
    gap: 20,
  },
  label: {
    fontFamily: font.medium,
    fontSize: 17,
    color: 'rgba(255,255,255,0.7)',
  },
  next: {
    fontFamily: font.regular,
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
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
  ghost: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  solid: { backgroundColor: '#FFFFFF' },
  buttonLabel: { fontFamily: font.semibold, fontSize: 16 },
  ghostLabel: { color: '#FFFFFF' },
  solidLabel: { color: colors.green },
  link: {
    fontFamily: font.medium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
});
