import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font } from '../theme/tokens';

type Props = {
  label: string;
  value: string;
  /** Verde quando o valor é evolução. */
  highlight?: boolean;
  /** Texto pequeno ao lado do valor (variação). */
  delta?: string;
  valueSize?: number;
  labelSize?: number;
  /** Perfil usa rótulo primário e valor secundário — o inverso das outras listas. */
  invert?: boolean;
  paddingVertical?: number;
  last?: boolean;
};

/** Linha rótulo/valor com divisória — Início, Progresso e Perfil usam a mesma. */
export const ListRow = memo(function ListRow({
  label,
  value,
  highlight = false,
  delta,
  valueSize = 15,
  labelSize = 15,
  invert = false,
  paddingVertical = 17,
  last = false,
}: Props) {
  const valueColor = highlight
    ? colors.green
    : invert
      ? colors.textSecondary
      : colors.textPrimary;

  return (
    <View style={[styles.row, { paddingVertical }, last && styles.last]}>
      <Text
        style={[
          styles.label,
          { fontSize: labelSize, color: invert ? colors.textPrimary : colors.textSecondary },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <View style={styles.right}>
        <Text
          style={[
            styles.value,
            { fontSize: valueSize, color: valueColor },
            invert && styles.valueInvert,
          ]}
        >
          {value}
        </Text>
        {delta && <Text style={styles.delta}>{delta}</Text>}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral300,
  },
  last: { borderBottomWidth: 0 },
  label: { fontFamily: font.regular },
  right: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  value: { fontFamily: font.semibold },
  valueInvert: { fontFamily: font.medium },
  delta: { fontFamily: font.regular, fontSize: 13, color: colors.green },
});
