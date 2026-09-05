import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { themed, useSheet } from '../theme/theme';
import { radius } from '../theme/tokens';
import { typeSheets } from '../theme/type';

type Props = {
  title: string;
  body: string;
};

/** Sugestão de progressão — verde só porque é evolução. */
export const SuggestionCard = memo(function SuggestionCard({ title, body }: Props) {
  const styles = useSheet(sheets);
  const type = useSheet(typeSheets);
  return (
    <View style={styles.card}>
      <Text style={[type.cardTitleLg, styles.title]}>{title}</Text>
      <Text style={[type.paragraph, styles.body]}>{body}</Text>
    </View>
  );
});

const sheets = themed((colors) =>
  StyleSheet.create({
    card: {
      borderRadius: radius.card,
      padding: 20,
      backgroundColor: colors.greenSoftBg,
      gap: 6,
    },
    title: { color: colors.green },
    body: { color: colors.greenSoftText },
  })
);
