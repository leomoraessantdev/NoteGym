import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { themed, useColors, useSheet } from '../theme/theme';
import { font, radius } from '../theme/tokens';
import { BottomSheet } from './BottomSheet';

export type PickerOption<T> = {
  value: T;
  label: string;
  hint?: string;
};

type Props<T> = {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: PickerOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  onClose: () => void;
};

/** Lista de escolha única. O item ativo leva o check verde. */
export function PickerSheet<T extends string | number>({
  visible,
  title,
  subtitle,
  options,
  selected,
  onSelect,
  onClose,
}: Props<T>) {
  const colors = useColors();
  const styles = useSheet(sheets);
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} subtitle={subtitle}>
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        {options.map((option) => {
          const active = option.value === selected;
          return (
            <Pressable
              key={String(option.value)}
              onPress={() => {
                onSelect(option.value);
                onClose();
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={[styles.row, active && styles.rowActive]}
            >
              <View style={styles.text}>
                <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
                {option.hint && <Text style={styles.hint}>{option.hint}</Text>}
              </View>
              {active && (
                <Svg width={18} height={18} viewBox="0 0 16 16" fill="none">
                  <Path
                    d="M3.5 8.5l3 3 6-7"
                    stroke={colors.green}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}

const sheets = themed((colors) =>
  StyleSheet.create({
    scroll: { maxHeight: 420 },
    list: { gap: 8, paddingBottom: 8 },
    row: {
      minHeight: 56,
      borderRadius: 18,
      paddingHorizontal: 18,
      paddingVertical: 14,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    rowActive: { backgroundColor: colors.greenSoftBg },
    text: { flex: 1, gap: 3 },
    label: { fontFamily: font.medium, fontSize: 16, color: colors.textPrimary },
    labelActive: { color: colors.green, fontFamily: font.semibold },
    hint: { fontFamily: font.regular, fontSize: 13, color: colors.textTertiary },
  })
);
