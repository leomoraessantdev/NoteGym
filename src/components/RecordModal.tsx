import { Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { longDate } from '../lib/date';
import { br, setLabel } from '../lib/format';
import type { PersonalRecord } from '../state/useWorkoutRunner';
import { colors, font, radius, tracking } from '../theme/tokens';
import { Button } from './Button';

type Props = {
  record: PersonalRecord | null;
  unit: string;
  onDismiss: () => void;
};

/** Dispara quando uma série concluída bate a melhor marca do exercício. */
export function RecordModal({ record, unit, onDismiss }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={!!record} animationType="slide" transparent onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: 28 + insets.bottom }]}>
          {record && (
            <>
              <View style={styles.badge}>
                <Text style={styles.badgeGlyph}>↑</Text>
              </View>

              <Text style={styles.kicker}>Novo recorde</Text>

              <Text style={styles.headline}>
                {record.exerciseName}
                {'\n'}
                {setLabel(record.kg, record.reps)}
              </Text>

              <Text style={styles.body}>
                {br(record.gainPercent)}% acima do seu recorde anterior, de{' '}
                {br(record.previousKg)} {unit} em {longDate(record.previousDay)}.
              </Text>

              <Button label="Continuar treino" onPress={onDismiss} height={60} style={styles.cta} />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: 28,
    gap: 10,
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.greenSoftBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  badgeGlyph: { fontFamily: font.semibold, fontSize: 20, color: colors.green },
  kicker: { fontFamily: font.semibold, fontSize: 15, color: colors.green },
  headline: {
    fontFamily: font.bold,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: tracking(-0.03, 30),
    color: colors.textPrimary,
  },
  body: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  cta: { marginTop: 12 },
});
