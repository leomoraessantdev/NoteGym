import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '../components/BottomSheet';
import { CrossIcon } from '../components/CrossIcon';
import { DraggableList } from '../components/DraggableList';
import { Stepper } from '../components/Stepper';
import { Button } from '../components/Button';
import { createExercise, listExercises, listMuscleGroups } from '../db/workouts';
import type { ExerciseRow } from '../db/types';
import { useAsync } from '../lib/useAsync';
import { useApp } from '../state/AppStore';
import { weight } from '../lib/format';
import { themed, useColors, useSheet } from '../theme/theme';
import { font, radius, spacing } from '../theme/tokens';
import { typeSheets } from '../theme/type';

type Props = {
  onDone: () => void;
};

/** Altura fixa da linha — é o que deixa o arraste saber para onde o dedo foi. */
const EXERCISE_ROW_HEIGHT = 80;

/** Criar ou editar um treino. A biblioteca entra por bottom sheet. */
export function CreateWorkoutScreen({ onDone }: Props) {
  const colors = useColors();
  const styles = useSheet(sheets);
  const type = useSheet(typeSheets);
  const insets = useSafeAreaInsets();
  const {
    settings,
    draft,
    renameDraft,
    addDraftExercise,
    removeDraftExercise,
    updateDraftExercise,
    moveDraftExercise,
    reorderDraftExercise,
    saveDraft,
  } = useApp();

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  /** Nome digitado que ainda não existe e o usuário quer criar. */
  const [creating, setCreating] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  /** Exercício com o sheet de séries e repetições aberto. */
  const [targetsFor, setTargetsFor] = useState<number | null>(null);

  /**
   * O rascunho como estava ao abrir a tela. Sair só avisa quando há algo a
   * perder — perguntar sempre vira ruído e a pessoa aprende a ignorar.
   */
  const opened = useRef(JSON.stringify({ name: draft.name, exercises: draft.exercises }));
  const dirty =
    JSON.stringify({ name: draft.name, exercises: draft.exercises }) !== opened.current;

  const results = useAsync<ExerciseRow[]>(
    () => (libraryOpen ? listExercises(query) : Promise.resolve([])),
    [],
    [query, libraryOpen, creating]
  );
  const groups = useAsync<string[]>(
    () => (creating ? listMuscleGroups() : Promise.resolve([])),
    [],
    [creating]
  );

  /** O que já está no treino não pode entrar de novo — a linha fica só informando. */
  const alreadyIn = useMemo(
    () => new Set(draft.exercises.map((e) => e.exerciseId)),
    [draft.exercises]
  );

  const term = query.trim();
  /** Só oferece criar quando o nome digitado não existe igual na biblioteca. */
  const canCreate =
    term.length > 1 &&
    !results.loading &&
    !results.data.some((e) => e.name.toLowerCase() === term.toLowerCase());

  const addExercise = (exercise: ExerciseRow) => {
    addDraftExercise(exercise);
    setLibraryOpen(false);
    setQuery('');
    setCreating(null);
  };

  const save = async () => {
    await saveDraft();
    onDone();
  };

  const target = targetsFor === null ? null : (draft.exercises[targetsFor] ?? null);

  const leave = () => {
    if (dirty) {
      setConfirmLeave(true);
      return;
    }
    onDone();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={leave} hitSlop={10} accessibilityRole="button">
          <Text style={styles.back}>‹ Voltar</Text>
        </Pressable>
        <Pressable onPress={() => void save()} hitSlop={10} accessibilityRole="button">
          <Text style={styles.save}>Salvar</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.block}>
          <Text style={type.meta}>Nome do treino</Text>
          <TextInput
            value={draft.name}
            onChangeText={renameDraft}
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
            placeholder="Ex.: Treino A — Peito"
            placeholderTextColor={colors.textDisabled}
            accessibilityLabel="Nome do treino"
            style={[
              styles.nameInput,
              { borderColor: nameFocused ? colors.green : colors.neutral300 },
            ]}
          />
        </View>

        <View style={styles.blockTight}>
          <Text style={type.meta}>Exercícios</Text>

          <DraggableList
            items={draft.exercises}
            keyOf={(exercise, index) => `${exercise.exerciseId}-${index}`}
            itemHeight={EXERCISE_ROW_HEIGHT}
            gap={12}
            onReorder={reorderDraftExercise}
            renderItem={(exercise, { index, handle, dragging }) => (
              <View style={[styles.exerciseCard, dragging && styles.exerciseCardDragging]}>
                <View
                  {...handle}
                  style={styles.grip}
                  accessibilityRole="adjustable"
                  accessibilityLabel={`Reordenar ${exercise.name}`}
                  accessibilityHint="Arraste para mudar a ordem"
                  accessibilityActions={[
                    { name: 'increment', label: 'Descer' },
                    { name: 'decrement', label: 'Subir' },
                  ]}
                  onAccessibilityAction={(event) => {
                    if (event.nativeEvent.actionName === 'increment') moveDraftExercise(index, 1);
                    if (event.nativeEvent.actionName === 'decrement') moveDraftExercise(index, -1);
                  }}
                >
                  <View style={styles.gripBar} />
                  <View style={styles.gripBar} />
                  <View style={styles.gripBar} />
                </View>

                <Pressable
                  onPress={() => setTargetsFor(index)}
                  accessibilityRole="button"
                  accessibilityLabel={`Séries e repetições de ${exercise.name}`}
                  style={styles.exerciseText}
                >
                  <Text style={type.cardTitle} numberOfLines={1}>
                    {exercise.name}
                  </Text>
                  <Text style={type.meta} numberOfLines={1}>
                    {exercise.sets} séries de {exercise.repMin}–{exercise.repMax}
                    {exercise.lastLoad !== null
                      ? ` · ${weight(exercise.lastLoad, settings.unit)}`
                      : ' · sem carga ainda'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => removeDraftExercise(index)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`Remover ${exercise.name}`}
                  style={styles.remove}
                >
                  <CrossIcon size={12} />
                </Pressable>
              </View>
            )}
          />

          <Button
            label="Adicionar exercício"
            variant="secondary"
            height={58}
            onPress={() => setLibraryOpen(true)}
          />
        </View>
      </ScrollView>

      <BottomSheet
        visible={libraryOpen}
        onClose={() => {
          setLibraryOpen(false);
          setCreating(null);
        }}
        heightRatio={0.74}
        title={creating ? 'Qual grupo?' : 'Exercícios'}
        subtitle={creating ? `Onde "${creating}" entra na sua biblioteca.` : undefined}
      >
        {creating ? (
          <>
            <ScrollView
              contentContainerStyle={styles.libraryList}
              showsVerticalScrollIndicator={false}
            >
              {groups.data.map((group) => (
                <Pressable
                  key={group}
                  onPress={async () => {
                    const created = await createExercise(creating, group);
                    addExercise(created);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Criar em ${group}`}
                  style={styles.libraryItem}
                >
                  <Text style={styles.libraryName}>{group}</Text>
                  <Text style={styles.plus}>+</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable onPress={() => setCreating(null)} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.backLink}>‹ Voltar para a busca</Text>
            </Pressable>
          </>
        ) : (
          <>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar ou nomear um exercício"
              placeholderTextColor={colors.textDisabled}
              accessibilityLabel="Buscar exercício"
              style={styles.search}
            />

            <ScrollView
              contentContainerStyle={styles.libraryList}
              showsVerticalScrollIndicator={false}
            >
              {canCreate && (
                <Pressable
                  onPress={() => setCreating(term)}
                  accessibilityRole="button"
                  accessibilityLabel={`Criar exercício ${term}`}
                  style={[styles.libraryItem, styles.createItem]}
                >
                  <View style={styles.libraryText}>
                    <Text style={[styles.libraryName, styles.createName]}>Criar "{term}"</Text>
                    <Text style={type.metaSmall}>Um exercício seu, com o nome que quiser</Text>
                  </View>
                  <Text style={styles.plus}>+</Text>
                </Pressable>
              )}

              {results.data.map((item) => {
                const added = alreadyIn.has(item.id);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => !added && addExercise(item)}
                    disabled={added}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: added }}
                    accessibilityLabel={
                      added ? `${item.name} já está no treino` : `Adicionar ${item.name}`
                    }
                    style={[styles.libraryItem, added && styles.libraryItemAdded]}
                  >
                    <View style={styles.libraryText}>
                      <Text style={[styles.libraryName, added && styles.libraryNameAdded]}>
                        {item.name}
                      </Text>
                      <Text style={type.metaSmall}>
                        {added ? 'já está no treino' : item.muscle_group}
                        {!added && item.is_custom ? ' · seu' : ''}
                      </Text>
                    </View>
                    <Text style={[styles.plus, added && styles.plusAdded]}>{added ? '✓' : '+'}</Text>
                  </Pressable>
                );
              })}

              {!results.loading && results.data.length === 0 && !canCreate && (
                <Text style={type.meta}>Digite o nome do exercício para buscar ou criar.</Text>
              )}
            </ScrollView>
          </>
        )}
      </BottomSheet>

      <BottomSheet
        visible={target !== null}
        onClose={() => setTargetsFor(null)}
        title={target?.name}
        subtitle="Quantas séries e em que faixa de repetições. É a faixa que decide quando o app sugere subir a carga."
      >
        {target && targetsFor !== null && (
          <View style={styles.targets}>
            <TargetRow
              label="Séries"
              value={String(target.sets)}
              unit="séries"
              onChange={(delta) =>
                updateDraftExercise(targetsFor, {
                  sets: target.sets + delta,
                  repMin: target.repMin,
                  repMax: target.repMax,
                })
              }
            />
            <TargetRow
              label="Repetições, no mínimo"
              value={String(target.repMin)}
              unit="reps"
              onChange={(delta) =>
                updateDraftExercise(targetsFor, {
                  sets: target.sets,
                  repMin: target.repMin + delta,
                  repMax: target.repMax,
                })
              }
            />
            <TargetRow
              label="Repetições, no máximo"
              value={String(target.repMax)}
              unit="reps"
              onChange={(delta) =>
                updateDraftExercise(targetsFor, {
                  sets: target.sets,
                  repMin: target.repMin,
                  repMax: target.repMax + delta,
                })
              }
            />
          </View>
        )}
        <Button label="Pronto" onPress={() => setTargetsFor(null)} height={56} />
      </BottomSheet>

      <BottomSheet
        visible={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        title="Sair sem salvar?"
        subtitle="As mudanças deste treino não foram gravadas ainda."
      >
        <Button
          label="Salvar e sair"
          onPress={() => {
            setConfirmLeave(false);
            void save();
          }}
          height={56}
        />
        <Pressable
          onPress={() => {
            setConfirmLeave(false);
            onDone();
          }}
          accessibilityRole="button"
          style={styles.discardChanges}
        >
          <Text style={styles.discardChangesLabel}>Descartar mudanças</Text>
        </Pressable>
      </BottomSheet>
    </View>
  );
}

/** Uma linha do sheet de alvos: rótulo à esquerda, stepper à direita. */
function TargetRow({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  value: string;
  unit: string;
  onChange: (delta: -1 | 1) => void;
}) {
  const styles = useSheet(sheets);
  return (
    <View style={styles.targetRow}>
      <Text style={styles.targetLabel}>{label}</Text>
      <View style={styles.targetStepper}>
        <Stepper
          value={value}
          unit={unit}
          onDecrement={() => onChange(-1)}
          onIncrement={() => onChange(1)}
          decrementLabel={`Diminuir ${label}`}
          incrementLabel={`Aumentar ${label}`}
        />
      </View>
    </View>
  );
}

const sheets = themed((colors, theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    topBar: {
      paddingTop: 8,
      paddingBottom: 16,
      paddingHorizontal: spacing.screenX,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    back: { fontFamily: font.medium, fontSize: 16, color: colors.textSecondary },
    save: { fontFamily: font.semibold, fontSize: 16, color: colors.green },
    content: { paddingHorizontal: spacing.screenX, gap: spacing.block },
    block: { gap: 10 },
    blockTight: { gap: 12 },
    nameInput: {
      height: 58,
      borderRadius: radius.button,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      paddingHorizontal: 18,
      fontFamily: font.semibold,
      fontSize: 19,
      color: colors.textPrimary,
    },
    exerciseCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      boxShadow: theme.cardShadow,
    },
    exerciseCardDragging: {
      boxShadow: '0px 8px 20px rgba(60,50,35,0.16)',
      transform: [{ scale: 1.01 }],
    },
    grip: {
      width: 28,
      height: EXERCISE_ROW_HEIGHT,
      gap: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    /** Altura inteira: meio pixel some no arredondamento da tela. */
    gripBar: {
      width: 16,
      height: 2,
      borderRadius: 1,
      backgroundColor: colors.neutral500,
    },
    exerciseText: { flex: 1, gap: 5 },
    remove: {
      width: 30,
      height: 30,
      borderRadius: radius.pill,
      backgroundColor: colors.neutral100,
      alignItems: 'center',
      justifyContent: 'center',
    },

    search: {
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.surface,
      paddingHorizontal: 18,
      fontFamily: font.regular,
      fontSize: 16,
      color: colors.textPrimary,
    },
    libraryList: { gap: 10, paddingBottom: 12 },
    libraryItem: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      paddingVertical: 16,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    libraryText: { gap: 4 },
    libraryName: { fontFamily: font.medium, fontSize: 16, color: colors.textPrimary },
    createItem: { backgroundColor: colors.greenSoftBg },
    libraryItemAdded: { backgroundColor: colors.neutral100 },
    libraryNameAdded: { color: colors.textTertiary },
    plusAdded: { color: colors.textTertiary, fontSize: 16 },
    createName: { color: colors.green, fontFamily: font.semibold },
    backLink: {
      fontFamily: font.medium,
      fontSize: 15,
      color: colors.textSecondary,
      paddingVertical: 6,
    },
    plus: { fontFamily: font.medium, fontSize: 22, color: colors.green },
    targets: { gap: 12 },
    targetRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    targetLabel: { flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.textPrimary },
    targetStepper: { width: 132 },
    discardChanges: { height: 52, alignItems: 'center', justifyContent: 'center' },
    discardChangesLabel: { fontFamily: font.semibold, fontSize: 15, color: colors.red },
  })
);
