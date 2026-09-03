import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cardShadow, colors, font, radius } from '../theme/tokens';
import { type } from '../theme/type';

type Props = {
  hint: string;
  onPress: () => void;
};

/** Atalho para o histórico do exercício. */
export const NotesCard = memo(function NotesCard({ hint, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Abrir minhas anotações"
      style={styles.card}
    >
      <View style={styles.text}>
        <Text style={type.cardTitle}>Minhas anotações</Text>
        <Text style={type.meta} numberOfLines={1}>
          {hint}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    boxShadow: cardShadow,
  },
  text: { flex: 1, gap: 5 },
  chevron: {
    fontFamily: font.medium,
    fontSize: 20,
    color: colors.textTertiary,
  },
});
