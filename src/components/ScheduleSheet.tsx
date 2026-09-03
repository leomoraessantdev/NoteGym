import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { WorkoutRow } from '../db/types';
import type { Schedule } from '../db/schedule';
import { WEEKDAY_NAMES } from '../db/schedule';
import { colors, font, radius } from '../theme/tokens';
import { type } from '../theme/type';
import { BottomSheet } from './BottomSheet';

type Props = {
  visible: boolean;
  schedule: Schedule;
  workouts: WorkoutRow[];
  onPick: (weekday: number, workoutId: string | null) => void;
  onClose: () => void;
};

/**
 * Monta a semana: cada dia recebe um treino ou vira descanso.
 * Duas etapas no mesmo sheet — a semana e, ao tocar num dia, as opções dele.
 */
export function ScheduleSheet({ visible, schedule, workouts, onPick, onClose }: Props) {
  const [editing, setEditing] = useState<number | null>(null);

  // Cada abertura começa pela semana inteira.
  useEffect(() => {
    if (visible) setEditing(null);
  }, [visible]);

  const title = editing === null ? 'Sua semana' : WEEKDAY_NAMES[editing];
  const subtitle =
    editing === null
      ? 'Escolha o treino de cada dia. Os dias sem treino viram descanso.'
      : 'O que você treina neste dia?';

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} subtitle={subtitle}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {editing === null
          ? WEEKDAY_NAMES.map((name, weekday) => {
              const workout = workouts.find((w) => w.id === schedule[weekday]);
              return (
                <Pressable
                  key={name}
                  onPress={() => setEditing(weekday)}
                  accessibilityRole="button"
                  accessibilityLabel={`Configurar ${name}`}
                  style={styles.row}
                >
                  <Text style={styles.weekday}>{name}</Text>
                  <View style={styles.value}>
                    <Text
                      style={[styles.valueText, !workout && styles.restText]}
                      numberOfLines={1}
                    >
                      {workout ? workout.title : 'Descanso'}
                    </Text>
                    <Text style={styles.chevron}>›</Text>
                  </View>
                </Pressable>
              );
            })
          : [
              <Pressable
                key="rest"
                onPress={() => {
                  onPick(editing, null);
                  setEditing(null);
                }}
                accessibilityRole="button"
                style={[styles.option, schedule[editing] === undefined && styles.optionActive]}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    schedule[editing] === undefined && styles.optionLabelActive,
                  ]}
                >
                  Descanso
                </Text>
              </Pressable>,
              ...workouts.map((workout) => {
                const active = schedule[editing] === workout.id;
                return (
                  <Pressable
                    key={workout.id}
                    onPress={() => {
                      onPick(editing, workout.id);
                      setEditing(null);
                    }}
                    accessibilityRole="button"
                    style={[styles.option, active && styles.optionActive]}
                  >
                    <View style={styles.badge}>
                      <Text style={styles.badgeLetter}>{workout.letter}</Text>
                    </View>
                    <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                      {workout.title}
                    </Text>
                  </Pressable>
                );
              }),
            ]}

        {editing === null && workouts.length === 0 && (
          <Text style={type.meta}>Crie um treino primeiro para montar a semana.</Text>
        )}
      </ScrollView>

      {editing !== null && (
        <Pressable onPress={() => setEditing(null)} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.back}>‹ Voltar para a semana</Text>
        </Pressable>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 400 },
  list: { gap: 8, paddingBottom: 8 },
  row: {
    minHeight: 56,
    borderRadius: 18,
    paddingHorizontal: 18,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  weekday: { fontFamily: font.medium, fontSize: 16, color: colors.textPrimary },
  value: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  valueText: { fontFamily: font.medium, fontSize: 15, color: colors.green, flexShrink: 1 },
  restText: { color: colors.textTertiary },
  chevron: { fontFamily: font.medium, fontSize: 18, color: colors.textTertiary },

  option: {
    minHeight: 56,
    borderRadius: 18,
    paddingHorizontal: 18,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  optionActive: { backgroundColor: colors.greenSoftBg },
  optionLabel: { fontFamily: font.medium, fontSize: 16, color: colors.textPrimary, flex: 1 },
  optionLabelActive: { color: colors.green, fontFamily: font.semibold },
  badge: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.neutral200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLetter: { fontFamily: font.semibold, fontSize: 14, color: colors.textSecondary },

  back: { fontFamily: font.medium, fontSize: 15, color: colors.textSecondary, paddingVertical: 6 },
});
