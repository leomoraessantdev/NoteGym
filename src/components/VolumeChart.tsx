import { memo } from 'react';
import { themed, useColors, useSheet } from '../theme/theme';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

const WIDTH = 330;
const HEIGHT = 150;
const PADDING_X = 10;
/** A grade emoldura os dados: o topo é o pico da janela, a base é o zero. */
const TOP = 26;
const BOTTOM = 134;
const GRID_Y = [TOP, (TOP + BOTTOM) / 2, BOTTOM];

type Props = {
  /** Valores normalizados 0..1, do mais antigo ao mais recente. */
  series: number[];
};

/** Volume por semana. Cresce com a largura da tela sem distorcer o traço. */
export const VolumeChart = memo(function VolumeChart({ series }: Props) {
  const colors = useColors();
  const styles = useSheet(sheets);
  const step = series.length > 1 ? (WIDTH - PADDING_X * 2) / (series.length - 1) : 0;
  const points = series.map((value, i) => {
    const x = PADDING_X + i * step;
    const y = BOTTOM - Math.min(1, Math.max(0, value)) * (BOTTOM - TOP);
    return { x, y };
  });
  const last = points[points.length - 1];

  return (
    <View style={styles.wrapper}>
      <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} fill="none">
        {GRID_Y.map((y) => (
          <Line key={y} x1={0} y1={y} x2={WIDTH} y2={y} stroke={colors.neutral300} />
        ))}
        <Polyline
          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
          stroke={colors.green}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {last && <Circle cx={last.x} cy={last.y} r={5.5} fill={colors.green} />}
      </Svg>
    </View>
  );
});

const sheets = themed((colors) =>
  StyleSheet.create({
    wrapper: { height: HEIGHT },
  })
);
