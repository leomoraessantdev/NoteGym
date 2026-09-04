import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CrossIcon } from '../components/CrossIcon';
import { Stepper } from '../components/Stepper';
import { rewriteExerciseSets, sessionDetail, updateLoggedSet } from '../db/sessions';
import type { SessionDetail } from '../db/types';
import { longDate } from '../lib/date';
import { tapLight } from '../lib/feedback';
import { br } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { cardShadow, colors, font, radius, spacing } from '../theme/tokens';
import { type } from '../theme/type';

const STEP_KG = 2.5;

type Props = {
  sessionId: string;
  unit: string;
  onDone: () => void;
};

/**
 * O treino que já aconteceu, aberto para conserto.
 *
 * Errar a carga na hora é comum — anotar 38 quando foram 35. Aqui a série
 * gravada volta a ser editável, e o histórico, os recordes e o progresso
 * seguem o valor corrigido, porque leem a mesma tabela.
 */
export function SessionDetailScreen({ sessionId, unit, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const [revision, setRevision] = useState(0);

  const detail = useAsync<SessionDetail | null>(
    () => sessionDetail(sessionId),
    null,
    [sessionId, revision]
  );

  const reload = useCallback(() => setRevision((r) => r + 1), []);

  const changeSet = useCallback(
    async (exerciseId: string, setIndex: number, kg: number, reps: number) => {
      await updateLoggedSet(sessionId, exerciseId, setIndex, kg, reps);
      reload();
    },
    [sessionId, reload]
  );

  const removeSet = useCallback(
    async (exerciseId: string, setIndex: number) => {
      const exercise = detail.data?.exercises.find((e) => e.exerciseId === exerciseId);
      if (!exercise) return;
      tapLight();
      const remaining = exercise.sets
        .filter((s) => s.set_index !== setIndex)
        .map((s) => ({ kg: s.kg, reps: s.reps }));
      await rewriteExerciseSets(sessionId, exerciseId, remaining);
      reload();
    },
    [detail.data, sessionId, reload]
  );

  if (detail.loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }

  const session = detail.data;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={onDone} hitSlop={10} accessibilityRole="button">
          <Text style={styles.back}>‹ Voltar</Text>
        </Pressable>
        <Pressable onPress={onDone} hitSlop={10} accessibilityRole="button">
          <Text style={styles.done}>Pronto</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {!session ? (
          <Text style={type.meta}>Este treino não foi encontrado.</Text>
        ) : (
          <>
            <View style={styles.heading}>
              <Text style={type.meta}>{longDate(session.day)}</Text>
              <Text style={type.screenTitle}>{session.workoutTitle ?? 'Treino'}</Text>
              <Text style={type.paragraph}>
                Ajuste os valores para corrigir. A mudança vale para o histórico, os recordes e o
                progresso.
              </Text>
            </View>

            {session.exercises.map((exercise) => (
              <View key={exercise.exerciseId} style={styles.exercise}>
                <Text style={type.cardTitleLg}>{exercise.name}</Text>

                {exercise.sets.map((set) => (
                  <View key={set.set_index} style={styles.setCard}>
                    <Text style={styles.setNumber}>{set.set_index + 1}</Text>

                    <View style={styles.steppers}>
                      <View style={styles.loadStepper}>
                        <Stepper
                          value={br(set.kg)}
                          unit={unit}
                          onDecrement={() =>
                            void changeSet(
                              exercise.exerciseId,
                              set.set_index,
                              Math.max(0, set.kg - STEP_KG),
                              set.reps
                            )
                          }
                          onIncrement={() =>
                            void changeSet(
                              exercise.exerciseId,
                              set.set_index,
                              set.kg + STEP_KG,
                              set.reps
                            )
                          }
                          decrementLabel={`Diminuir carga da série ${set.set_index + 1}`}
                          incrementLabel={`Aumentar carga da série ${set.set_index + 1}`}
                        />
                      </View>
                      <View style={styles.repsStepper}>
                        <Stepper
                          value={String(set.reps)}
                          unit="reps"
                          onDecrement={() =>
                            void changeSet(
                              exercise.exerciseId,
                              set.set_index,
                              set.kg,
                              Math.max(1, set.reps - 1)
                            )
                          }
                          onIncrement={() =>
                            void changeSet(exercise.exerciseId, set.set_index, set.kg, set.reps + 1)
                          }
                          decrementLabel={`Diminuir repetições da série ${set.set_index + 1}`}
                          incrementLabel={`Aumentar repetições da série ${set.set_index + 1}`}
                        />
                      </View>
                    </View>

                    <Pressable
                      onPress={() => void removeSet(exercise.exerciseId, set.set_index)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={`Excluir série ${set.set_index + 1} de ${exercise.name}`}
                      style={styles.remove}
                    >
                      <CrossIcon size={12} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ))}

            {session.exercises.length === 0 && (
              <Text style={type.meta}>Nenhuma série ficou registrada neste treino.</Text>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  topBar: {
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: spacing.screenX,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: { fontFamily: font.medium, fontSize: 16, color: colors.textSecondary },
  done: { fontFamily: font.semibold, fontSize: 16, color: colors.green },
  content: { paddingHorizontal: spacing.screenX, gap: spacing.block },
  heading: { gap: 8 },
  exercise: { gap: 10 },
  setCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    boxShadow: cardShadow,
  },
  setNumber: {
    width: 18,
    textAlign: 'center',
    fontFamily: font.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textTertiary,
  },
  steppers: { flex: 1, flexDirection: 'row', gap: 8 },
  loadStepper: { flex: 1.12 },
  repsStepper: { flex: 0.88 },
  remove: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
