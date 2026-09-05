import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { themed, useColors, useSheet } from '../theme/theme';
import { font, radius } from '../theme/tokens';

type Props = {
  options: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  height?: number;
};

/** Trilho neutro, item ativo em branco. Mesmo padrão no Calendário e no Progresso. */
export const SegmentedControl = memo(function SegmentedControl({
  options,
  selectedIndex,
  onChange,
  height = 38,
}: Props) {
  const styles = useSheet(sheets);
  return (
    <View style={styles.track}>
      {options.map((label, i) => (
        <Segment
          key={label}
          label={label}
          index={i}
          active={i === selectedIndex}
          height={height}
          onPress={onChange}
        />
      ))}
    </View>
  );
});

type SegmentProps = {
  label: string;
  index: number;
  active: boolean;
  height: number;
  onPress: (index: number) => void;
};

function Segment({ label, index, active, height, onPress }: SegmentProps) {
  const colors = useColors();
  const styles = useSheet(sheets);
  const press = useCallback(() => onPress(index), [onPress, index]);
  return (
    <Pressable
      onPress={press}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={[
        styles.segment,
        { height, backgroundColor: active ? colors.surface : 'transparent' },
      ]}
    >
      <Text
        style={[styles.label, { color: active ? colors.textPrimary : colors.textSecondary }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const sheets = themed((colors) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      padding: 4,
      borderRadius: radius.pill,
      backgroundColor: colors.neutral300,
    },
    segment: {
      flex: 1,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    label: { fontFamily: font.medium, fontSize: 14 },
  })
);
