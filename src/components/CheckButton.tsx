import { Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { themed, useColors, useSheet } from '../theme/theme';
import { radius, touch } from '../theme/tokens';

type Props = {
  done: boolean;
  onPress: () => void;
  accessibilityLabel: string;
};

/** Circulo de 52 px. Pendente: branco, borda #DCD6CC. Concluido: verde solido. */
export function CheckButton({ done, onPress, accessibilityLabel }: Props) {
  const colors = useColors();
  const styles = useSheet(sheets);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.button,
        {
          backgroundColor: done ? colors.greenSurface : colors.surface,
          borderColor: done ? colors.greenSurface : colors.neutral500,
        },
      ]}
    >
      <Svg width={18} height={18} viewBox="0 0 16 16" fill="none">
        <Path
          d="M3.5 8.5l3 3 6-7"
          stroke={done ? '#FFFFFF' : colors.checkIdle}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}

const sheets = themed((colors) =>
  StyleSheet.create({
    button: {
      width: touch.check,
      height: touch.check,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
  })
);
