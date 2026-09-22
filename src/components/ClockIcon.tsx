import { memo } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

type Props = { color: string; size?: number };

/** Relógio no mesmo traço dos ícones das abas: stroke 2, pontas redondas. */
export const ClockIcon = memo(function ClockIcon({ color, size = 22 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={2} fill="none" />
      <Path
        d="M12 7.5V12l3 2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
});
