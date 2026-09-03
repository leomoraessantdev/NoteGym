import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, font, radius } from '../theme/tokens';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  height?: number;
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  height = 56,
  disabled = false,
  style,
}: Props) {
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          backgroundColor: primary ? colors.green : colors.neutral400,
          transform: [{ scale: pressed && !disabled ? 0.99 : 1 }],
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: disabled
              ? colors.textDisabled
              : primary
                ? '#FFFFFF'
                : colors.textPrimary,
            fontSize: primary ? 16 : 15,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: font.semibold,
  },
});
