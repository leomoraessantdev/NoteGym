import { memo } from 'react';
import { useColors } from '../theme/theme';
import Svg, { Path } from 'react-native-svg';

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
  color,
  strokeWidth = 1.8,
}: Props) {
  const colors = useColors();
  // O padrão vem do tema, então não pode ser valor padrão de parâmetro.
  const stroke = color ?? colors.textTertiary;
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <Path
        d="M2.5 2.5l7 7M9.5 2.5l-7 7"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
});
