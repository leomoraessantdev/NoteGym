import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { themed, useSheet } from '../theme/theme';
import { spacing } from '../theme/tokens';
import { typeSheets } from '../theme/type';
import { Button } from './Button';

type Props = {
  message: string;
  onRetry: () => void;
};

/**
 * O banco não abriu.
 *
 * Sem esta tela o app entrava normalmente e mostrava tudo vazio: nenhum treino,
 * nenhum histórico, nenhum recorde — como se a pessoa nunca tivesse treinado.
 * Dizer que a falha é de leitura evita esse susto.
 */
export function StartupError({ message, onRetry }: Props) {
  const styles = useSheet(sheets);
  const type = useSheet(typeSheets);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.card}>
        <Text style={type.screenTitle}>Seus dados não abriram</Text>
        <Text style={type.paragraph}>
          {message} Nada foi apagado — o registro continua no aparelho. Tente de novo, e se
          insistir, feche e abra o app.
        </Text>
        <Button label="Tentar de novo" onPress={onRetry} height={56} />
      </View>
    </View>
  );
}

const sheets = themed((colors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.screenX,
    },
    card: { alignSelf: 'stretch', gap: 14 },
  })
);
