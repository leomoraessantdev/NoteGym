import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, touch } from '../theme/tokens';
import { type } from '../theme/type';

type Props = {
  value: string;
  unit: string;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementLabel: string;
  incrementLabel: string;
};

/** − valor unidade + — altura 52, raio 14, fundo #F4F1EB. */
export function Stepper({
  value,
  unit,
  onDecrement,
  onIncrement,
  decrementLabel,
  incrementLabel,
}: Props) {
  return (
    <View style={styles.track}>
      <Pressable
        onPress={onDecrement}
        style={styles.arm}
        accessibilityRole="button"
        accessibilityLabel={decrementLabel}
      >
        <Text style={styles.sign}>−</Text>
      </Pressable>

      <View style={styles.readout}>
        <Text style={type.setValue}>{value}</Text>
        <Text style={type.unit}>{unit}</Text>
      </View>

      <Pressable
        onPress={onIncrement}
        style={styles.arm}
        accessibilityRole="button"
        accessibilityLabel={incrementLabel}
      >
        <Text style={styles.sign}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.input,
    height: touch.stepper,
  },
  arm: {
    width: 34,
    height: touch.stepper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sign: {
    fontFamily: font.medium,
    fontSize: 18,
    color: colors.textSecondary,
  },
  readout: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 3,
  },
});
