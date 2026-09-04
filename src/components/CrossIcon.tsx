import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme/tokens';

type Props = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

/**
 * O "×" como caractere nunca cai no centro do círculo: a fonte reserva espaço
 * diferente acima e abaixo. Desenhado, o cruzamento fica exatamente no meio.
 */
export const CrossIcon = memo(function CrossIcon({
  size = 12,
  color = colors.textTertiary,
  strokeWidth = 1.8,
}: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <Path
        d="M2.5 2.5l7 7M9.5 2.5l-7 7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
});
