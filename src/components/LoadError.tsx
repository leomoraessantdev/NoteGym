import { Pressable, StyleSheet, Text, View } from 'react-native';
import { themed, useSheet } from '../theme/theme';
import { font, radius } from '../theme/tokens';

type Props = {
  message: string;
  onRetry: () => void;
};

/**
 * Uma leitura falhou, mas o resto da tela está de pé.
 *
 * Sem esta linha o bloco simplesmente vinha vazio, e vazio aqui quer dizer
 * "você ainda não treinou" — que é bem diferente de "não consegui ler". A tela
 * inteira caindo é outro caso, e tem a sua própria em `StartupError`.
 */
export function LoadError({ message, onRetry }: Props) {
  const styles = useSheet(sheets);
  return (
    <View style={styles.row}>
      <Text style={styles.message}>{message}</Text>
      <Pressable onPress={onRetry} hitSlop={10} accessibilityRole="button">
        <Text style={styles.action}>Tentar de novo</Text>
      </Pressable>
    </View>
  );
}

const sheets = themed((colors) =>
  StyleSheet.create({
    row: {
      backgroundColor: colors.redSoftBg,
      borderRadius: radius.card,
      paddingVertical: 12,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    message: { flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.red },
    action: { fontFamily: font.semibold, fontSize: 13, lineHeight: 18, color: colors.red },
  })
);
