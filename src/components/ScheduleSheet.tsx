import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Schedule } from '../db/schedule';
import { WEEKDAY_DISPLAY_ORDER, WEEKDAY_NAMES } from '../db/schedule';
import type { WorkoutRow } from '../db/types';
import { themed, useColors, useSheet } from '../theme/theme';
import { font, radius } from '../theme/tokens';
import { typeSheets } from '../theme/type';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';

type Props = {
  visible: boolean;
  schedule: Schedule;
  workouts: WorkoutRow[];
  onPick: (weekday: number, workoutId: string | null) => void;
  /** Cria um treino com o nome digitado e devolve o id. */
  onCreateWorkout: (title: string) => Promise<string>;
  onClose: () => void;
};

/** Em que passo o sheet está: a semana, as opções de um dia, ou um nome novo. */
type Step = { kind: 'week' } | { kind: 'day'; weekday: number } | { kind: 'name' };

/**
 * Monta a semana. Cada dia recebe um treino ou vira descanso, e treinos novos
 * — "Peito e bíceps", "Push", o que for — nascem aqui na própria semana.
 */
export function ScheduleSheet({
  visible,
  schedule,
  workouts,
  onPick,
  onCreateWorkout,
  onClose,
}: Props) {
  const colors = useColors();
  const styles = useSheet(sheets);
  const type = useSheet(typeSheets);
  const [step, setStep] = useState<Step>({ kind: 'week' });
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  // Cada abertura começa pela semana inteira.
  useEffect(() => {
    if (visible) {
      setStep({ kind: 'week' });
      setName('');
    }
  }, [visible]);

  const title =
    step.kind === 'week'
      ? 'Sua semana'
      : step.kind === 'day'
        ? WEEKDAY_NAMES[step.weekday]
        : 'Novo treino';

  const subtitle =
    step.kind === 'week'
      ? 'Escolha o treino de cada dia. Os dias sem treino viram descanso.'
      : step.kind === 'day'
        ? 'O que você treina neste dia?'
        : 'Dê o nome que quiser. Depois é só colocar no dia.';

  const createWorkout = async () => {
    const clean = name.trim();
    if (!clean || saving) return;
    setSaving(true);
    try {
      await onCreateWorkout(clean);
      setName('');
      setStep({ kind: 'week' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} subtitle={subtitle}>
      {step.kind === 'week' && (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {WEEKDAY_DISPLAY_ORDER.map((weekday) => {
              const weekdayName = WEEKDAY_NAMES[weekday];
              const workout = workouts.find((w) => w.id === schedule[weekday]);
              return (
                <Pressable
                  key={weekdayName}
                  onPress={() => setStep({ kind: 'day', weekday })}
                  accessibilityRole="button"
                  accessibilityLabel={`Configurar ${weekdayName}`}
                  style={styles.row}
                >
                  <Text style={styles.weekday}>{weekdayName}</Text>
                  <View style={styles.value}>
                    <Text style={[styles.valueText, !workout && styles.restText]} numberOfLines={1}>
                      {workout ? workout.title : 'Descanso'}
                    </Text>
                    <Text style={styles.chevron}>›</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            onPress={() => setStep({ kind: 'name' })}
            accessibilityRole="button"
            accessibilityLabel="Criar treino com outro nome"
            style={styles.createRow}
          >
            <View style={styles.createBadge}>
              <Text style={styles.createPlus}>+</Text>
            </View>
            <View style={styles.createText}>
              <Text style={styles.createLabel}>Criar outro treino</Text>
              <Text style={type.metaSmall}>Peito e bíceps, Push, Full body…</Text>
            </View>
          </Pressable>
        </>
      )}

      {step.kind === 'day' && (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              onPress={() => {
                onPick(step.weekday, null);
                setStep({ kind: 'week' });
              }}
              accessibilityRole="button"
              accessibilityLabel="Marcar como descanso"
              style={[styles.option, schedule[step.weekday] === undefined && styles.optionActive]}
            >
              <Text
                style={[
                  styles.optionLabel,
                  schedule[step.weekday] === undefined && styles.optionLabelActive,
                ]}
              >
                Descanso
              </Text>
            </Pressable>

            {workouts.map((workout) => {
              const active = schedule[step.weekday] === workout.id;
              return (
                <Pressable
                  key={workout.id}
                  onPress={() => {
                    onPick(step.weekday, workout.id);
                    setStep({ kind: 'week' });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Usar ${workout.title}`}
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
            })}
          </ScrollView>

          <Pressable
            onPress={() => setStep({ kind: 'week' })}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text style={styles.back}>‹ Voltar para a semana</Text>
          </Pressable>
        </>
      )}

      {step.kind === 'name' && (
        <>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ex.: Peito, ombro e tríceps"
            placeholderTextColor={colors.textDisabled}
            accessibilityLabel="Nome do treino"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => void createWorkout()}
            style={styles.input}
          />
          <Text style={type.metaSmall}>
            O treino nasce vazio. Os exercícios você monta em Treinos, quando quiser.
          </Text>
          <Button
            label={saving ? 'Criando…' : 'Criar treino'}
            onPress={() => void createWorkout()}
            height={56}
          />
          <Pressable
            onPress={() => setStep({ kind: 'week' })}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text style={styles.back}>‹ Voltar para a semana</Text>
          </Pressable>
        </>
      )}
    </BottomSheet>
  );
}

const sheets = themed((colors) =>
  StyleSheet.create({
    scroll: { maxHeight: 360 },
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
      paddingVertical: 10,
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

    createRow: {
      minHeight: 56,
      borderRadius: 18,
      paddingHorizontal: 18,
      paddingVertical: 10,
      backgroundColor: colors.greenSoftBg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    createBadge: {
      width: 34,
      height: 34,
      borderRadius: radius.pill,
      backgroundColor: colors.onGreen,
      alignItems: 'center',
      justifyContent: 'center',
    },
    createPlus: { fontFamily: font.medium, fontSize: 20, lineHeight: 24, color: colors.greenSurface },
    createText: { flex: 1, gap: 3 },
    createLabel: { fontFamily: font.semibold, fontSize: 16, color: colors.green },

    input: {
      height: 58,
      borderRadius: radius.button,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.green,
      paddingHorizontal: 18,
      fontFamily: font.semibold,
      fontSize: 18,
      color: colors.textPrimary,
    },

    back: { fontFamily: font.medium, fontSize: 15, color: colors.textSecondary, paddingVertical: 6 },
  })
);
