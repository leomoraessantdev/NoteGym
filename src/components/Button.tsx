import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { themed, useColors, useSheet } from '../theme/theme';
import { font, radius } from '../theme/tokens';

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
  const colors = useColors();
  const styles = useSheet(sheets);
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          backgroundColor: primary ? colors.greenSurface : colors.neutral400,
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

const sheets = themed((colors) =>
  StyleSheet.create({
    base: {
      borderRadius: radius.button,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      fontFamily: font.semibold,
    },
  })
);
