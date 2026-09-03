import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { ListRow } from '../components/ListRow';
import { ScreenScroll } from '../components/ScreenScroll';
import { homeSummary, records, sessionsBefore, weeklyVolume } from '../db/stats';
import type { RecordRow, WeekVolume } from '../db/stats';
import { isoDay, longDate, shiftDays } from '../lib/date';
import { br, plural, setLabel } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { useApp } from '../state/AppStore';
import { usePlan } from '../state/usePlan';
import { useResponsive } from '../theme/layout';
import { cardShadow, colors, font, radius, tracking } from '../theme/tokens';
import { type } from '../theme/type';

type Props = {
  onStartWorkout: (workoutId: string) => void;
};

const WEEKS = 7;

/** Degradê de neutro a verde: a semana mais forte fecha a série. */
const BAR_COLORS = [
  colors.neutral400,
  colors.neutral400,
  colors.neutral400,
  colors.greenMid,
  colors.greenMid,
  '#7FA891',
  colors.green,
];

/** Em uma olhada: o que treinar hoje e o botão para começar. */
export function HomeScreen({ onStartWorkout }: Props) {
  const { fs } = useResponsive();
  const { settings, revision } = useApp();
  const today = isoDay(new Date());

  const before = useAsync(() => sessionsBefore(today), 0, [today, revision]);
  const { planFor, today: todayPlan } = usePlan(() => before.data);
  const tomorrowPlan = planFor(isoDay(shiftDays(new Date(), 1)));

  const summary = useAsync(
    () => homeSummary(settings.daysPerWeek),
    { lastDay: null as string | null, doneThisWeek: 0, volumeChangePercent: null as number | null },
    [settings.daysPerWeek, revision]
  );
  const volume = useAsync<WeekVolume[]>(() => weeklyVolume(WEEKS), [], [revision]);
  const topRecords = useAsync<RecordRow[]>(() => records(1), [], [revision]);

  const bars = useMemo(() => {
    const peak = Math.max(1, ...volume.data.map((w) => w.volume));
    return volume.data.map((w) => Math.max(0.06, w.volume / peak));
  }, [volume.data]);

  /** A legenda só afirma o que os dados sustentam. */
  const volumeCaption = useMemo(() => {
    const weeks = volume.data;
    if (weeks.every((w) => w.volume === 0)) {
      return 'Sete semanas de volume. Registre um treino para começar a linha.';
    }
    const last = weeks[weeks.length - 1]?.volume ?? 0;
    const peak = Math.max(...weeks.map((w) => w.volume));
    if (last >= peak) return 'Sete semanas de volume. A última foi a sua maior.';
    return 'Sete semanas de volume. Esta semana ainda está começando.';
  }, [volume.data]);

  const rows = [
    {
      label: 'Último treino',
      value: summary.data.lastDay ? longDate(summary.data.lastDay) : 'nenhum ainda',
      highlight: false,
    },
    {
      label: 'Esta semana',
      value: `${summary.data.doneThisWeek} de ${settings.daysPerWeek} treinos`,
      highlight: summary.data.doneThisWeek > 0,
    },
    {
      label: 'Depois de hoje',
      value: tomorrowPlan.workout?.title ?? 'Descanso',
      highlight: false,
    },
  ];

  const record = topRecords.data[0];
  const change = summary.data.volumeChangePercent;
  const plannedWorkout = todayPlan.workout;

  return (
    <ScreenScroll>
      <View style={styles.greetingRow}>
        <Text style={styles.greeting}>
          Bom treino,{'\n'}
          {settings.profileName}.
        </Text>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>{settings.profileName[0] ?? '?'}</Text>
        </View>
      </View>

      <View style={styles.todayCard}>
        <View style={styles.todayText}>
          <Text style={styles.kicker}>Hoje é dia de</Text>
          <Text style={[styles.todayTitle, { fontSize: fs(32), lineHeight: fs(34) }]}>
            {plannedWorkout?.title ?? 'Descanso'}
          </Text>
          <Text style={type.bodyMuted}>
            {!plannedWorkout
              ? 'Dia livre. Se quiser, registre um treino avulso.'
              : plannedWorkout.exercise_count === 0
                ? 'Este treino ainda não tem exercícios. Monte ele em Treinos.'
                : `${plural(plannedWorkout.exercise_count, 'exercício', 'exercícios')} · cerca de ${
                    plannedWorkout.exercise_count * 10
                  } minutos`}
          </Text>
        </View>

        {plannedWorkout && (
          <Button
            label="Começar treino"
            onPress={() => onStartWorkout(plannedWorkout.id)}
            height={60}
          />
        )}
      </View>

      <View>
        {rows.map((row, i) => (
          <ListRow
            key={row.label}
            label={row.label}
            value={row.value}
            highlight={row.highlight}
            last={i === rows.length - 1}
          />
        ))}
      </View>

      <View style={styles.evolution}>
        <View style={styles.evolutionHead}>
          <Text style={type.cardTitleLg}>Você está subindo</Text>
          {change !== null && (
            <Text style={styles.evolutionDelta}>
              {change > 0 ? '+' : ''}
              {br(change)}% no mês
            </Text>
          )}
        </View>
        <View style={styles.bars} accessibilityLabel="Volume das últimas sete semanas">
          {bars.map((height, i) => (
            <View
              key={i}
              style={[
                styles.bar,
                { height: `${height * 100}%`, backgroundColor: BAR_COLORS[i] ?? colors.neutral400 },
              ]}
            />
          ))}
        </View>
        <Text style={type.paragraph}>{volumeCaption}</Text>
      </View>

      {record && (
        <View style={styles.recordCard}>
          <View style={styles.recordBadge}>
            <Text style={styles.recordGlyph}>↑</Text>
          </View>
          <View style={styles.recordText}>
            <Text style={type.cardTitle}>Melhor marca: {record.name}</Text>
            <Text style={type.meta}>
              {setLabel(record.kg, record.reps, settings.unit)} · {longDate(record.day)}
            </Text>
          </View>
        </View>
      )}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  greetingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: {
    flex: 1,
    fontFamily: font.semibold,
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: tracking(-0.02, 26),
    color: colors.textPrimary,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.neutral400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontFamily: font.semibold, fontSize: 16, color: colors.textSecondary },

  todayCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.cardLg,
    padding: 24,
    gap: 20,
    boxShadow: cardShadow,
  },
  todayText: { gap: 8 },
  kicker: { fontFamily: font.medium, fontSize: 14, color: colors.textSecondary },
  todayTitle: {
    fontFamily: font.bold,
    letterSpacing: tracking(-0.03, 32),
    color: colors.textPrimary,
  },

  evolution: { gap: 14 },
  evolutionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  evolutionDelta: { fontFamily: font.medium, fontSize: 14, color: colors.green },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, height: 80 },
  bar: { flex: 1, borderRadius: 8 },

  recordCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    boxShadow: cardShadow,
  },
  recordBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.greenSoftBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordGlyph: { fontFamily: font.semibold, fontSize: 17, color: colors.green },
  recordText: { flex: 1, gap: 4 },
});
