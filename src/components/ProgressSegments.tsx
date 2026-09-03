import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme/tokens';

type Props = {
  total: number;
  currentIndex: number;
};

/** Um segmento por exercício: feitos e atual em verde, restantes em neutro. */
export const ProgressSegments = memo(function ProgressSegments({ total, currentIndex }: Props) {
  return (
    <View style={styles.row} accessibilityRole="progressbar">
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.segment,
            { backgroundColor: i <= currentIndex ? colors.green : colors.neutral400 },
          ]}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  segment: {
    flex: 1,
    height: 5,
    borderRadius: radius.pill,
  },
});
