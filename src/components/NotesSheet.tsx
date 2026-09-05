import { useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { bestMark, exerciseHistory } from '../db/sessions';
import type { BestMarkRow, ExerciseSessionRow } from '../db/types';
import { longDate } from '../lib/date';
import { setLabel, weightDelta } from '../lib/format';
import { stepFor } from '../lib/units';
import { useAsync } from '../lib/useAsync';
import { themed, useColors, useSheet } from '../theme/theme';
import { type Palette, font, radius } from '../theme/tokens';
import { typeSheets } from '../theme/type';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';

type Props = {
  visible: boolean;
  exerciseId: string;
  exerciseName: string;
  unit: string;
  onClose: () => void;
};

type Row = ExerciseSessionRow & { delta: string; deltaColor: string };

/** Variação da sessão: maior carga contra a maior carga da sessão anterior. */
function withDeltas(sessions: ExerciseSessionRow[], unit: string, colors: Palette): Row[] {
  const heaviest = (s: ExerciseSessionRow) => s.sets.reduce((m, x) => Math.max(m, x.kg), 0);
  return sessions.map((session, i) => {
    const previous = sessions[i + 1];
    if (!previous) {
      return { ...session, delta: 'primeira vez', deltaColor: colors.textTertiary };
    }
    const d = heaviest(session) - heaviest(previous);
    if (d > 0) return { ...session, delta: weightDelta(d, unit), deltaColor: colors.green };
    if (d < 0) return { ...session, delta: weightDelta(d, unit), deltaColor: colors.red };
    return { ...session, delta: 'mesma carga', deltaColor: colors.textTertiary };
  });
}

/** Bottom sheet "Minhas anotações": o histórico que sustenta o produto. */
export function NotesSheet({ visible, exerciseId, exerciseName, unit, onClose }: Props) {
  const colors = useColors();
  const styles = useSheet(sheets);
  const type = useSheet(typeSheets);
  const history = useAsync<ExerciseSessionRow[]>(
    () => (visible ? exerciseHistory(exerciseId) : Promise.resolve([])),
    [],
    [exerciseId, visible]
  );
  const best = useAsync<BestMarkRow | null>(
    () => (visible ? bestMark(exerciseId) : Promise.resolve(null)),
    null,
    [exerciseId, visible]
  );

  const sessions = useMemo(() => withDeltas(history.data, unit, colors), [history.data, unit, colors]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      heightRatio={0.8}
      title={exerciseName}
      subtitle="O que você anotou nas últimas semanas"
    >
      {best.data && (
        <View style={styles.best}>
          <Text style={[type.cardTitle, { color: colors.green }]}>
            Sua melhor marca: {setLabel(best.data.kg, best.data.reps, unit)}, em{' '}
            {longDate(best.data.day)}
          </Text>
          <Text style={[type.paragraph, { color: colors.greenSoftText }]}>
            Repita a mesma carga ou suba {stepFor(unit)} {unit} quando fechar o topo da faixa.
          </Text>
        </View>
      )}

      {history.loading ? (
        <ActivityIndicator color={colors.green} style={styles.loader} />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.session_id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={type.meta}>
              Nada registrado ainda. Depois do primeiro treino, o histórico aparece aqui.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.sessionCard}>
              <View style={styles.sessionHead}>
                <Text style={type.cardTitle}>{longDate(item.day)}</Text>
                <Text style={[styles.delta, { color: item.deltaColor }]}>{item.delta}</Text>
              </View>

              {item.sets.map((s, i) => (
                <View key={i} style={[styles.setRow, i === 0 && styles.setRowFirst]}>
                  <Text style={type.metaSmall}>Série {i + 1}</Text>
                  <Text style={styles.setValue}>{setLabel(s.kg, s.reps, unit)}</Text>
                </View>
              ))}
            </View>
          )}
        />
      )}

      <Button label="Voltar ao treino" onPress={onClose} height={60} />
    </BottomSheet>
  );
}

const sheets = themed((colors, theme) =>
  StyleSheet.create({
    loader: { flex: 1 },
    best: {
      backgroundColor: colors.greenSoftBg,
      borderRadius: 20,
      padding: 18,
      gap: 6,
    },
    list: { gap: 12, paddingBottom: 18 },
    sessionCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.card,
      padding: 18,
      boxShadow: theme.cardShadow,
    },
    sessionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    delta: { fontFamily: font.medium, fontSize: 13 },
    setRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 11,
      borderTopWidth: 1,
      borderTopColor: colors.neutral300,
    },
    setRowFirst: { borderTopWidth: 0, paddingTop: 6 },
    setValue: { fontFamily: font.semibold, fontSize: 15, color: colors.textPrimary },
  })
);
