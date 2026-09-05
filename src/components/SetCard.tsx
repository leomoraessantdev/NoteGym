import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { themed, useColors, useSheet } from '../theme/theme';
import { font, radius } from '../theme/tokens';
import { CheckButton } from './CheckButton';
import { CrossIcon } from './CrossIcon';
import { Stepper } from './Stepper';

export type SetCardProps = {
  /** Base zero — o rótulo mostra index + 1. */
  index: number;
  kg: string;
  reps: number;
  unit: string;
  done: boolean;
  /** "Semana passada: 35 kg × 10" ou "série nova" */
  reference: string;
  /** "+2,5 kg" | "mesma carga" | "−5 lb" | "" — já na unidade do usuário. */
  diff: string;
  diffColor: string;
  /** A última série não pode ser removida — o exercício ficaria sem nenhuma. */
  removable: boolean;
  onKgChange: (index: number, delta: number) => void;
  onRepsChange: (index: number, delta: number) => void;
  onToggle: (index: number) => void;
  onRemove: (index: number) => void;
};

/**
 * Uma série. Recebe callbacks estáveis por índice para que o memo segure:
 * mexer numa série não re-renderiza as outras.
 */
export const SetCard = memo(function SetCard(props: SetCardProps) {
  const colors = useColors();
  const styles = useSheet(sheets);
  const { index, kg, reps, unit, done, reference, diff, diffColor, removable } = props;
  const { onKgChange, onRepsChange, onToggle, onRemove } = props;
  const number = index + 1;

  const kgDown = useCallback(() => onKgChange(index, -1), [onKgChange, index]);
  const kgUp = useCallback(() => onKgChange(index, 1), [onKgChange, index]);
  const repsDown = useCallback(() => onRepsChange(index, -1), [onRepsChange, index]);
  const repsUp = useCallback(() => onRepsChange(index, 1), [onRepsChange, index]);
  const toggle = useCallback(() => onToggle(index), [onToggle, index]);
  const remove = useCallback(() => onRemove(index), [onRemove, index]);

  return (
    <View style={[styles.card, { backgroundColor: done ? colors.greenSoftBg : colors.surface }]}>
      <View style={styles.row}>
        <Text style={[styles.number, { color: done ? colors.green : colors.textTertiary }]}>
          {number}
        </Text>

        <View style={styles.steppers}>
          <View style={styles.loadStepper}>
            <Stepper
              value={kg}
              unit={unit}
              onDecrement={kgDown}
              onIncrement={kgUp}
              decrementLabel={`Diminuir carga da série ${number}`}
              incrementLabel={`Aumentar carga da série ${number}`}
            />
          </View>
          <View style={styles.repsStepper}>
            <Stepper
              value={String(reps)}
              unit="reps"
              onDecrement={repsDown}
              onIncrement={repsUp}
              decrementLabel={`Diminuir repetições da série ${number}`}
              incrementLabel={`Aumentar repetições da série ${number}`}
            />
          </View>
        </View>

        <CheckButton done={done} onPress={toggle} accessibilityLabel={`Concluir série ${number}`} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.reference} numberOfLines={1}>
          {reference}
        </Text>

        <View style={styles.footerRight}>
          {!!diff && <Text style={[styles.diff, { color: diffColor }]}>{diff}</Text>}
          {removable && (
            <Pressable
              onPress={remove}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={`Excluir série ${number}`}
              style={styles.remove}
            >
              <CrossIcon size={11} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
});

const sheets = themed((colors, theme) =>
  StyleSheet.create({
    card: {
      borderRadius: radius.card,
      paddingVertical: 14,
      paddingHorizontal: 14,
      gap: 10,
      boxShadow: theme.cardShadow,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    number: {
      width: 18,
      textAlign: 'center',
      fontFamily: font.semibold,
      fontSize: 15,
      lineHeight: 20,
    },
    steppers: { flex: 1, flexDirection: 'row', gap: 8 },
    /** A carga precisa de mais espaço: chega a "107,5". */
    loadStepper: { flex: 1.12 },
    repsStepper: { flex: 0.88 },

    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      paddingLeft: 4,
    },
    reference: {
      flex: 1,
      fontFamily: font.regular,
      fontSize: 13,
      lineHeight: 17,
      color: colors.textTertiary,
    },
    footerRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
    diff: { fontFamily: font.medium, fontSize: 13, lineHeight: 17 },
    remove: {
      width: 22,
      height: 22,
      borderRadius: radius.pill,
      backgroundColor: colors.neutral100,
      alignItems: 'center',
      justifyContent: 'center',
    },
  })
);
