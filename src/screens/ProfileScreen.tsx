import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PickerSheet } from '../components/PickerSheet';
import { ScheduleSheet } from '../components/ScheduleSheet';
import { ScreenScroll } from '../components/ScreenScroll';
import { TextSheet } from '../components/TextSheet';
import { describeSchedule } from '../db/schedule';
import { plural } from '../lib/format';
import { useApp } from '../state/AppStore';
import { colors, font, radius } from '../theme/tokens';
import { type } from '../theme/type';

/** Qual editor está aberto. */
type Editor =
  | 'name'
  | 'goal'
  | 'unit'
  | 'daysPerWeek'
  | 'rest'
  | 'notifications'
  | 'account'
  | 'schedule'
  | null;

const GOALS = ['Hipertrofia', 'Força', 'Emagrecimento', 'Resistência', 'Saúde geral'];

/** 30 s a 4 min, de 15 em 15. */
const REST_CHOICES = Array.from({ length: 15 }, (_, i) => 30 + i * 15);

export function ProfileScreen() {
  const { settings, schedule, workouts, updateSetting, setScheduleDay, createNamedWorkout } =
    useApp();
  const [editor, setEditor] = useState<Editor>(null);
  const close = () => setEditor(null);

  const trainingDays = Object.keys(schedule).length;

  const rows: { key: Editor; label: string; value: string }[] = [
    { key: 'goal', label: 'Objetivo', value: settings.goal },
    { key: 'unit', label: 'Unidade de peso', value: settings.unit },
    {
      key: 'daysPerWeek',
      label: 'Meta semanal',
      value: plural(settings.daysPerWeek, 'treino', 'treinos'),
    },
    {
      key: 'schedule',
      label: 'Dias de treino',
      value: trainingDays === 0 ? 'não definidos' : plural(trainingDays, 'dia', 'dias'),
    },
    { key: 'rest', label: 'Descanso', value: `${settings.restSeconds} segundos` },
    { key: 'notifications', label: 'Notificações', value: settings.notifications },
    { key: 'account', label: 'Conta', value: settings.accountEmail || 'sem conta' },
  ];

  return (
    <>
      <ScreenScroll>
        <Pressable
          onPress={() => setEditor('name')}
          accessibilityRole="button"
          accessibilityLabel="Editar nome"
          style={styles.identity}
        >
          <View style={styles.avatar}>
            <Text style={styles.initial}>{settings.profileName[0] ?? '?'}</Text>
          </View>
          <View style={styles.identityText}>
            <Text style={styles.name}>{settings.profileName}</Text>
            <Text style={styles.tagline}>
              {settings.goal} · {plural(settings.daysPerWeek, 'treino', 'treinos')} por semana
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <View>
          {rows.map((row, i) => (
            <Pressable
              key={row.label}
              onPress={() => setEditor(row.key)}
              accessibilityRole="button"
              accessibilityLabel={`Editar ${row.label}`}
              style={[styles.row, i === rows.length - 1 && styles.rowLast]}
            >
              <Text style={styles.rowLabel}>{row.label}</Text>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue} numberOfLines={1}>
                  {row.value}
                </Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Text style={type.paragraph}>{describeSchedule(schedule)}</Text>
      </ScreenScroll>

      <TextSheet
        visible={editor === 'name'}
        title="Seu nome"
        subtitle="É como o app te chama na tela de início."
        value={settings.profileName}
        placeholder="Como podemos te chamar?"
        onSave={(value) => void updateSetting('profileName', value)}
        onClose={close}
      />

      <TextSheet
        visible={editor === 'account'}
        title="Conta"
        subtitle="Só fica no aparelho por enquanto."
        value={settings.accountEmail}
        placeholder="seu@email.com"
        keyboardType="email-address"
        onSave={(value) => void updateSetting('accountEmail', value)}
        onClose={close}
      />

      <PickerSheet
        visible={editor === 'goal'}
        title="Objetivo"
        subtitle="Orienta as sugestões de progressão."
        options={GOALS.map((goal) => ({ value: goal, label: goal }))}
        selected={settings.goal}
        onSelect={(value) => void updateSetting('goal', value)}
        onClose={close}
      />

      <PickerSheet
        visible={editor === 'unit'}
        title="Unidade de peso"
        subtitle="Vale para todo o app: séries, histórico e progresso."
        options={[
          { value: 'kg', label: 'kg', hint: 'quilogramas' },
          { value: 'lb', label: 'lb', hint: 'libras' },
        ]}
        selected={settings.unit}
        onSelect={(value) => void updateSetting('unit', value)}
        onClose={close}
      />

      <PickerSheet
        visible={editor === 'daysPerWeek'}
        title="Meta semanal"
        subtitle="Quantos treinos você quer fazer por semana."
        options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({
          value: n,
          label: plural(n, 'treino', 'treinos'),
        }))}
        selected={settings.daysPerWeek}
        onSelect={(value) => void updateSetting('daysPerWeek', value)}
        onClose={close}
      />

      <PickerSheet
        visible={editor === 'rest'}
        title="Descanso entre séries"
        subtitle="O cronômetro abre com esse tempo ao concluir uma série."
        options={REST_CHOICES.map((seconds) => ({
          value: seconds,
          label: `${seconds} segundos`,
          hint:
            seconds >= 60
              ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
              : undefined,
        }))}
        selected={settings.restSeconds}
        onSelect={(value) => void updateSetting('restSeconds', value)}
        onClose={close}
      />

      <PickerSheet
        visible={editor === 'notifications'}
        title="Notificações"
        options={[
          { value: 'Ativas', label: 'Ativas' },
          { value: 'Desativadas', label: 'Desativadas' },
        ]}
        selected={settings.notifications}
        onSelect={(value) => void updateSetting('notifications', value)}
        onClose={close}
      />

      <ScheduleSheet
        visible={editor === 'schedule'}
        schedule={schedule}
        workouts={workouts}
        onPick={(weekday, workoutId) => void setScheduleDay(weekday, workoutId)}
        onCreateWorkout={createNamedWorkout}
        onClose={close}
      />
    </>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.neutral400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { fontFamily: font.semibold, fontSize: 22, color: colors.textSecondary },
  identityText: { flex: 1, gap: 5 },
  name: { fontFamily: font.semibold, fontSize: 21, color: colors.textPrimary },
  tagline: { fontFamily: font.regular, fontSize: 14, color: colors.textSecondary },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 19,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral300,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { fontFamily: font.regular, fontSize: 16, color: colors.textPrimary },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  rowValue: { fontFamily: font.medium, fontSize: 15, color: colors.textSecondary, flexShrink: 1 },
  chevron: { fontFamily: font.medium, fontSize: 18, color: colors.textTertiary },
});
