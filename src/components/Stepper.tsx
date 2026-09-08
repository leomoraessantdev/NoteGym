import { Pressable, StyleSheet, Text, View } from 'react-native';
import { themed, useSheet } from '../theme/theme';
import { font, radius, touch } from '../theme/tokens';

type Props = {
  value: string;
  unit: string;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementLabel: string;
  incrementLabel: string;
};

/**
 * − valor unidade + — altura 52, raio 14, fundo #F4F1EB.
 *
 * O miolo encolhe antes dos braços: uma carga de três dígitos aperta o número,
 * nunca empurra o "+" para fora do cartão.
 */
export function Stepper({
  value,
  unit,
  onDecrement,
  onIncrement,
  decrementLabel,
  incrementLabel,
}: Props) {
  const styles = useSheet(sheets);
  return (
    <View style={styles.track}>
      <Pressable
        onPress={onDecrement}
        style={styles.arm}
        hitSlop={{ top: 6, bottom: 6 }}
        accessibilityRole="button"
        accessibilityLabel={decrementLabel}
      >
        <Text style={styles.sign}>−</Text>
      </Pressable>

      <View style={styles.readout}>
        <Text
          style={styles.value}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {value}
        </Text>
        {!!unit && (
          <Text style={styles.unit} numberOfLines={1}>
            {unit}
          </Text>
        )}
      </View>

      <Pressable
        onPress={onIncrement}
        style={styles.arm}
        hitSlop={{ top: 6, bottom: 6 }}
        accessibilityRole="button"
        accessibilityLabel={incrementLabel}
      >
        <Text style={styles.sign}>+</Text>
      </Pressable>
    </View>
  );
}

const sheets = themed((colors) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.input,
      height: touch.stepper,
      overflow: 'hidden',
    },
    arm: {
      width: 28,
      height: touch.stepper,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    sign: {
      fontFamily: font.medium,
      fontSize: 18,
      lineHeight: 22,
      color: colors.textSecondary,
    },
    readout: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'center',
      gap: 3,
    },
    value: {
      flexShrink: 1,
      fontFamily: font.bold,
      fontSize: 19,
      lineHeight: 24,
      color: colors.textPrimary,
    },
    unit: {
      flexShrink: 0,
      fontFamily: font.regular,
      fontSize: 11,
      lineHeight: 14,
      color: colors.textTertiary,
    },
  })
);
