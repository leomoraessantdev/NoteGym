import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { ElapsedClock } from '../components/ElapsedClock';
import { NotesCard } from '../components/NotesCard';
import { NotesSheet } from '../components/NotesSheet';
import { ProgressSegments } from '../components/ProgressSegments';
import { RecordModal } from '../components/RecordModal';
import { RestOverlay } from '../components/RestOverlay';
import { SetCard } from '../components/SetCard';
import { SuggestionCard } from '../components/SuggestionCard';
import { br, setLabel } from '../lib/format';
import { STEP_KG, useWorkoutRunner } from '../state/useWorkoutRunner';
import { useResponsive } from '../theme/layout';
import { colors, font, radius, spacing, touch } from '../theme/tokens';
import { type } from '../theme/type';

type Props = {
  workoutId: string;
  unit: string;
  restSeconds: number;
  onExit: () => void;
  onFinish: () => void;
};

/**
 * Tela mais importante do produto: registrar carga e repetições série a série,
 * comparando com a semana passada. Modo focado — sem tab bar.
 * Cada check grava no banco na hora.
 */
export function WorkoutExecutionScreen({
  workoutId,
  unit,
  restSeconds,
  onExit,
  onFinish,
}: Props) {
  const insets = useSafeAreaInsets();
  const { fs } = useResponsive();
  const runner = useWorkoutRunner(workoutId, restSeconds);
  const { exercise, sets, reference, exIdx } = runner;

  /** Linha comparativa de cada série contra a última sessão registrada. */
  const rows = useMemo(
    () =>
      sets.map((set, i) => {
        const ref = reference[i];
        if (!ref) {
          return { reference: 'série nova', diff: '', diffColor: colors.textTertiary };
        }
        const d = set.kg - ref.kg;
        return {
          reference: `Semana passada: ${setLabel(ref.kg, ref.reps, unit)}`,
          diff: d > 0 ? `+${br(d)} ${unit}` : d < 0 ? `−${br(Math.abs(d))} ${unit}` : 'mesma carga',
          diffColor: d > 0 ? colors.green : d < 0 ? colors.red : colors.textTertiary,
        };
      }),
    [sets, reference, unit]
  );

  /**
   * Regra de progressão: fechou o topo da faixa de repetições, sobe 2,5 kg.
   * Vale a série concluída mais pesada que fechou o topo.
   */
  const suggestion = useMemo(() => {
    if (!exercise) return null;
    const closers = sets.filter((s) => s.done && s.reps >= exercise.repMax);
    if (closers.length === 0) return null;
    const top = closers.reduce((a, b) => (b.kg >= a.kg ? b : a));
    return {
      title: `Na próxima, tente ${br(top.kg + STEP_KG)} ${unit}`,
      body:
        `Você fez ${top.reps} repetições no topo da faixa com ${br(top.kg)} ${unit}. ` +
        `Subir ${br(STEP_KG)} ${unit} te deixa de novo entre ${exercise.repMin} e ${exercise.repMax}.`,
    };
  }, [sets, exercise, unit]);

  const historyHint = useMemo(() => {
    if (reference.length === 0) return 'Primeira vez com este exercício.';
    return `Semana passada: ${reference.map((s) => setLabel(s.kg, s.reps, unit)).join(' · ')}`;
  }, [reference, unit]);

  /** "Depois: série 4, 40,5 kg" — ou o próximo exercício, se acabaram as séries. */
  const nextLabel = useMemo(() => {
    const pending = sets.findIndex((s) => !s.done);
    if (pending >= 0) return `série ${pending + 1}, ${br(sets[pending].kg)} ${unit}`;
    const next = runner.exercises[(exIdx + 1) % Math.max(1, runner.exercises.length)];
    return next?.name ?? 'fim do treino';
  }, [sets, unit, runner.exercises, exIdx]);

  /** Enquanto recorde ou descanso estão na frente, não tire a tela debaixo deles. */
  const handleFinish = useCallback(async () => {
    if (runner.record || runner.resting) return;
    await runner.finish();
    onFinish();
  }, [runner, onFinish]);

  const handleExit = useCallback(async () => {
    await runner.abandon();
    onExit();
  }, [runner, onExit]);

  if (runner.loading || !exercise) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={handleExit} hitSlop={10} accessibilityRole="button">
          <Text style={styles.exit}>Sair</Text>
        </Pressable>

        <ElapsedClock initialSeconds={runner.elapsedSeconds} style={styles.elapsed} />

        <Pressable onPress={handleFinish} hitSlop={10} accessibilityRole="button">
          <Text style={styles.finish}>Finalizar</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heading}>
          <Text style={type.meta}>
            Exercício {exIdx + 1} de {runner.exercises.length}
          </Text>
          <Text style={[type.display, { fontSize: fs(34), lineHeight: fs(36) }]} numberOfLines={2}>
            {exercise.name}
          </Text>
          <Text style={type.bodyMuted}>
            {exercise.targetSets} séries de {exercise.repMin}–{exercise.repMax} repetições
          </Text>
        </View>

        <ProgressSegments total={runner.exercises.length} currentIndex={exIdx} />

        <View style={styles.sets}>
          {sets.map((set, i) => (
            <SetCard
              key={i}
              index={i}
              kg={br(set.kg)}
              reps={set.reps}
              unit={unit}
              done={set.done}
              reference={rows[i].reference}
              diff={rows[i].diff}
              diffColor={rows[i].diffColor}
              onKgChange={runner.changeKg}
              onRepsChange={runner.changeReps}
              onToggle={runner.toggleSet}
            />
          ))}

          <Button
            label="Adicionar série"
            variant="secondary"
            height={touch.stepper}
            onPress={runner.addSet}
          />
        </View>

        {suggestion && <SuggestionCard title={suggestion.title} body={suggestion.body} />}

        <View style={styles.footer}>
          <NotesCard hint={historyHint} onPress={runner.openNotes} />

          <View style={styles.actions}>
            <Pressable
              onPress={runner.previousExercise}
              disabled={!runner.canGoBack}
              accessibilityRole="button"
              accessibilityLabel="Exercício anterior"
              accessibilityState={{ disabled: !runner.canGoBack }}
              style={styles.back}
            >
              <Text
                style={[
                  styles.backGlyph,
                  { color: runner.canGoBack ? colors.textPrimary : colors.textDisabled },
                ]}
              >
                ‹
              </Text>
            </Pressable>

            <Button
              label="Descansar"
              variant="secondary"
              onPress={runner.startRest}
              style={styles.grow1}
            />
            <Button label="Próximo" onPress={runner.nextExercise} style={styles.grow13} />
          </View>
        </View>
      </ScrollView>

      <RestOverlay
        visible={runner.resting}
        duration={restSeconds}
        nextLabel={nextLabel}
        onFinish={runner.endRest}
      />

      <NotesSheet
        visible={runner.notesOpen}
        exerciseId={exercise.id}
        exerciseName={exercise.name}
        unit={unit}
        onClose={runner.closeNotes}
      />

      <RecordModal record={runner.record} unit={unit} onDismiss={runner.dismissRecord} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  topBar: {
    paddingTop: 8,
    paddingBottom: 18,
    paddingHorizontal: spacing.screenX,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exit: { fontFamily: font.medium, fontSize: 16, color: colors.textSecondary },
  elapsed: { fontFamily: font.medium, fontSize: 15, color: colors.textSecondary },
  finish: { fontFamily: font.semibold, fontSize: 16, color: colors.green },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.screenX,
    gap: spacing.block,
  },
  heading: { gap: 8 },
  sets: { gap: spacing.listGap },
  footer: { gap: 10 },
  actions: { flexDirection: 'row', gap: 10 },
  back: {
    width: touch.secondaryButton,
    height: touch.secondaryButton,
    borderRadius: radius.button,
    backgroundColor: colors.neutral400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backGlyph: { fontFamily: font.medium, fontSize: 20 },
  grow1: { flex: 1 },
  grow13: { flex: 1.3 },
});
