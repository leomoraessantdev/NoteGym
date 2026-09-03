import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme/tokens';
import { type } from '../theme/type';

type Props = {
  title: string;
  body: string;
};

/** Sugestão de progressão — verde só porque é evolução. */
export const SuggestionCard = memo(function SuggestionCard({ title, body }: Props) {
  return (
    <View style={styles.card}>
      <Text style={[type.cardTitleLg, styles.title]}>{title}</Text>
      <Text style={[type.paragraph, styles.body]}>{body}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: 20,
    backgroundColor: colors.greenSoftBg,
    gap: 6,
  },
  title: { color: colors.green },
  body: { color: colors.greenSoftText },
});
