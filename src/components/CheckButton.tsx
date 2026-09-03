import { Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, radius, touch } from '../theme/tokens';

type Props = {
  done: boolean;
  onPress: () => void;
  accessibilityLabel: string;
};

/** Circulo de 52 px. Pendente: branco, borda #DCD6CC. Concluido: verde solido. */
export function CheckButton({ done, onPress, accessibilityLabel }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.button,
        {
          backgroundColor: done ? colors.green : colors.surface,
          borderColor: done ? colors.green : colors.neutral500,
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

const styles = StyleSheet.create({
  button: {
    width: touch.check,
    height: touch.check,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
