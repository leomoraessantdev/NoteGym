import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '../components/BottomSheet';
import { Button } from '../components/Button';
import { listExercises } from '../db/workouts';
import type { ExerciseRow } from '../db/types';
import { useAsync } from '../lib/useAsync';
import { useApp } from '../state/AppStore';
import { br } from '../lib/format';
import { cardShadow, colors, font, radius, spacing } from '../theme/tokens';
import { type } from '../theme/type';

type Props = {
  onDone: () => void;
};

/** Criar ou editar um treino. A biblioteca entra por bottom sheet. */
export function CreateWorkoutScreen({ onDone }: Props) {
  const insets = useSafeAreaInsets();
  const {
    draft,
    renameDraft,
    addDraftExercise,
    removeDraftExercise,
    moveDraftExercise,
    saveDraft,
  } = useApp();

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [nameFocused, setNameFocused] = useState(false);

  const results = useAsync<ExerciseRow[]>(
    () => (libraryOpen ? listExercises(query) : Promise.resolve([])),
    [],
    [query, libraryOpen]
  );

  const save = async () => {
    await saveDraft();
    onDone();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={onDone} hitSlop={10} accessibilityRole="button">
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

          {draft.exercises.map((exercise, index) => (
            <View key={`${exercise.exerciseId}-${index}`} style={styles.exerciseCard}>
              <View style={styles.reorder}>
                <Pressable
                  onPress={() => moveDraftExercise(index, -1)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Subir ${exercise.name}`}
                >
                  <Text style={styles.arrow}>▲</Text>
                </Pressable>
                <Pressable
                  onPress={() => moveDraftExercise(index, 1)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Descer ${exercise.name}`}
                >
                  <Text style={styles.arrow}>▼</Text>
                </Pressable>
              </View>

              <View style={styles.exerciseText}>
                <Text style={type.cardTitle} numberOfLines={1}>
                  {exercise.name}
                </Text>
                <Text style={type.meta} numberOfLines={1}>
                  {exercise.sets} séries de {exercise.repMin}–{exercise.repMax}
                  {exercise.lastLoad !== null ? ` · ${br(exercise.lastLoad)} kg` : ' · sem carga ainda'}
                </Text>
              </View>

              <Pressable
                onPress={() => removeDraftExercise(index)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remover ${exercise.name}`}
                style={styles.remove}
              >
                <Text style={styles.removeGlyph}>×</Text>
              </Pressable>
            </View>
          ))}

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
        onClose={() => setLibraryOpen(false)}
        heightRatio={0.74}
        title="Exercícios"
      >
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar exercício"
          placeholderTextColor={colors.textDisabled}
          accessibilityLabel="Buscar exercício"
          style={styles.search}
        />

        <ScrollView contentContainerStyle={styles.libraryList} showsVerticalScrollIndicator={false}>
          {results.data.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                addDraftExercise(item);
                setLibraryOpen(false);
                setQuery('');
              }}
              accessibilityRole="button"
              accessibilityLabel={`Adicionar ${item.name}`}
              style={styles.libraryItem}
            >
              <View style={styles.libraryText}>
                <Text style={styles.libraryName}>{item.name}</Text>
                <Text style={type.metaSmall}>{item.muscle_group}</Text>
              </View>
              <Text style={styles.plus}>+</Text>
            </Pressable>
          ))}

          {!results.loading && results.data.length === 0 && (
            <Text style={type.meta}>Nenhum exercício encontrado para essa busca.</Text>
          )}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    boxShadow: cardShadow,
  },
  reorder: { gap: 6 },
  arrow: { fontFamily: font.medium, fontSize: 11, color: colors.checkIdle },
  exerciseText: { flex: 1, gap: 5 },
  remove: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeGlyph: { fontFamily: font.regular, fontSize: 16, color: colors.textTertiary },

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
  plus: { fontFamily: font.medium, fontSize: 22, color: colors.green },
});
