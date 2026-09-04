import { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, radius } from '../theme/tokens';
import { CrossIcon } from './CrossIcon';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Altura como fração da tela. Sem valor, o sheet se ajusta ao conteúdo. */
  heightRatio?: number;
  title?: string;
  subtitle?: string;
  /** Sheets ancorados usam o fundo do app; menus flutuantes usam branco. */
  floating?: boolean;
  children: ReactNode;
};

/** Base dos bottom sheets: overlay, puxador, cabeçalho e fechar por toque fora. */
export function BottomSheet({
  visible,
  onClose,
  heightRatio,
  title,
  subtitle,
  floating = false,
  children,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.backdrop, floating && styles.backdropFloating]}>
        <Pressable
          style={styles.dismiss}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
        />

        <View
          style={[
            floating ? styles.floating : styles.anchored,
            heightRatio ? { height: `${heightRatio * 100}%` } : null,
            { paddingBottom: (floating ? 12 : 24) + insets.bottom },
          ]}
        >
          {!floating && <View style={styles.grabber} />}

          {title && (
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title} numberOfLines={2}>
                  {title}
                </Text>
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={`Fechar ${title}`}
                style={styles.close}
              >
                <CrossIcon size={13} color={colors.textSecondary} strokeWidth={2} />
              </Pressable>
            </View>
          )}

          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  backdropFloating: { padding: 14 },
  dismiss: { flex: 1 },
  anchored: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: 22,
    paddingTop: 18,
    gap: 16,
  },
  floating: {
    backgroundColor: colors.surface,
    borderRadius: 26,
    padding: 12,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.neutral500,
    alignSelf: 'center',
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerText: { flex: 1, gap: 5 },
  title: {
    fontFamily: font.semibold,
    fontSize: 20,
    lineHeight: 26,
    color: colors.textPrimary,
  },
  subtitle: { fontFamily: font.regular, fontSize: 14, color: colors.textSecondary },
  close: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.neutral300,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
