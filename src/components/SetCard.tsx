import { memo, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { cardShadow, colors, font, radius } from '../theme/tokens';
import { type } from '../theme/type';
import { CheckButton } from './CheckButton';
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
  /** "+2,5 kg" | "mesma carga" | "−2,5 kg" | "" */
  diff: string;
  diffColor: string;
  onKgChange: (index: number, delta: number) => void;
  onRepsChange: (index: number, delta: number) => void;
  onToggle: (index: number) => void;
};

/**
 * Uma série. Recebe callbacks estáveis por índice para que o memo segure:
 * mexer numa série não re-renderiza as outras.
 */
export const SetCard = memo(function SetCard(props: SetCardProps) {
  const { index, kg, reps, unit, done, reference, diff, diffColor } = props;
  const { onKgChange, onRepsChange, onToggle } = props;
  const number = index + 1;

  const kgDown = useCallback(() => onKgChange(index, -1), [onKgChange, index]);
  const kgUp = useCallback(() => onKgChange(index, 1), [onKgChange, index]);
  const repsDown = useCallback(() => onRepsChange(index, -1), [onRepsChange, index]);
  const repsUp = useCallback(() => onRepsChange(index, 1), [onRepsChange, index]);
  const toggle = useCallback(() => onToggle(index), [onToggle, index]);

  return (
    <View style={[styles.card, { backgroundColor: done ? colors.greenSoftBg : colors.surface }]}>
      <View style={styles.row}>
        <Text style={[styles.number, { color: done ? colors.green : colors.textTertiary }]}>
          {number}
        </Text>

        <View style={styles.steppers}>
          <Stepper
            value={kg}
            unit={unit}
            onDecrement={kgDown}
            onIncrement={kgUp}
            decrementLabel={`Diminuir carga da série ${number}`}
            incrementLabel={`Aumentar carga da série ${number}`}
          />
          <Stepper
            value={String(reps)}
            unit="reps"
            onDecrement={repsDown}
            onIncrement={repsUp}
            decrementLabel={`Diminuir repetições da série ${number}`}
            incrementLabel={`Aumentar repetições da série ${number}`}
          />
        </View>

        <CheckButton
          done={done}
          onPress={toggle}
          accessibilityLabel={`Concluir série ${number}`}
        />
      </View>

      <View style={styles.comparison}>
        <Text style={type.metaSmall} numberOfLines={1}>
          {reference}
        </Text>
        <Text style={[styles.diff, { color: diffColor }]}>{diff}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
    boxShadow: cardShadow,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  number: { width: 30, fontFamily: font.semibold, fontSize: 15 },
  steppers: { flex: 1, flexDirection: 'row', gap: 10 },
  comparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 2,
  },
  diff: { fontFamily: font.medium, fontSize: 13 },
});
