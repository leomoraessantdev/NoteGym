import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../components/BottomSheet';
import { Button } from '../components/Button';
import { ScreenScroll } from '../components/ScreenScroll';
import type { WorkoutRow } from '../db/types';
import { shortDate } from '../lib/date';
import { plural } from '../lib/format';
import { useApp } from '../state/AppStore';
import { cardShadow, colors, font, radius } from '../theme/tokens';
import { type } from '../theme/type';

type Props = {
  onOpenEditor: () => void;
};

/** "último em 21/08", ou o aviso de treino nunca feito. */
function lastDoneLabel(iso: string | null): string {
  return iso ? `último em ${shortDate(iso)}` : 'ainda não feito';
}

export function WorkoutsScreen({ onOpenEditor }: Props) {
  const { workouts, ready, newDraft, editDraft, duplicateWorkout, deleteWorkout } = useApp();
  const [menuFor, setMenuFor] = useState<WorkoutRow | null>(null);

  const openEditor = async (workout: WorkoutRow) => {
    await editDraft(workout);
    setMenuFor(null);
    onOpenEditor();
  };

  const createNew = () => {
    newDraft();
    onOpenEditor();
  };

  return (
    <>
      <ScreenScroll gap={22}>
        <Text style={type.screenTitle}>Meus treinos</Text>

        {ready && workouts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Você ainda não criou{'\n'}nenhum treino.</Text>
            <Text style={styles.emptyBody}>
              Comece com os exercícios que você já faz. Dá para mudar tudo depois.
            </Text>
            <Button
              label="Criar meu primeiro treino"
              onPress={createNew}
              height={54}
              style={styles.emptyCta}
            />
          </View>
        ) : (
          <View style={styles.list}>
            {workouts.map((workout, index) => {
              const isFirst = index === 0;
              return (
                <View key={workout.id} style={styles.card}>
                  {/* O "···" fica fora da área de abrir para não empilhar dois toques. */}
                  <Pressable
                    onPress={() => void openEditor(workout)}
                    accessibilityRole="button"
                    accessibilityLabel={`Abrir ${workout.title}`}
                    style={styles.cardMain}
                  >
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: isFirst ? colors.greenSoftBg : colors.neutral200 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeLetter,
                          { color: isFirst ? colors.green : colors.textSecondary },
                        ]}
                      >
                        {workout.letter}
                      </Text>
                    </View>

                    <View style={styles.cardText}>
                      <Text style={type.cardTitleLg} numberOfLines={1}>
                        {workout.title}
                      </Text>
                      <Text style={type.meta} numberOfLines={1}>
                        {plural(workout.exercise_count, 'exercício', 'exercícios')} ·{' '}
                        {lastDoneLabel(workout.last_done)}
                      </Text>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => setMenuFor(workout)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={`Opções de ${workout.title}`}
                    style={styles.menuTrigger}
                  >
                    <Text style={styles.menuGlyph}>···</Text>
                  </Pressable>
                </View>
              );
            })}

            <Button label="Novo treino" variant="secondary" height={58} onPress={createNew} />
          </View>
        )}
      </ScreenScroll>

      <BottomSheet visible={!!menuFor} onClose={() => setMenuFor(null)} floating>
        <MenuItem label="Editar" onPress={() => menuFor && void openEditor(menuFor)} />
        <MenuItem
          label="Duplicar"
          onPress={() => {
            if (menuFor) void duplicateWorkout(menuFor.id);
            setMenuFor(null);
          }}
        />
        <MenuItem
          label="Excluir"
          destructive
          onPress={() => {
            if (menuFor) void deleteWorkout(menuFor.id);
            setMenuFor(null);
          }}
        />
      </BottomSheet>
    </>
  );
}

function MenuItem({
  label,
  onPress,
  destructive = false,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.menuItem}>
      <Text style={[styles.menuLabel, destructive && { color: colors.red }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingVertical: 20,
    paddingLeft: 20,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    boxShadow: cardShadow,
  },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 16 },
  badge: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLetter: { fontFamily: font.semibold, fontSize: 17 },
  cardText: { flex: 1, gap: 5 },
  menuTrigger: { paddingHorizontal: 10, paddingVertical: 14 },
  menuGlyph: { fontFamily: font.medium, fontSize: 18, color: colors.textTertiary },

  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.cardLg,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 18,
    boxShadow: cardShadow,
  },
  emptyTitle: {
    fontFamily: font.semibold,
    fontSize: 20,
    lineHeight: 27,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  emptyBody: {
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  emptyCta: { paddingHorizontal: 26, borderRadius: 16 },

  menuItem: { height: 56, borderRadius: 16, paddingHorizontal: 18, justifyContent: 'center' },
  menuLabel: { fontFamily: font.medium, fontSize: 16, color: colors.textPrimary },
});
