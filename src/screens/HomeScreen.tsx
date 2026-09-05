import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { ListRow } from '../components/ListRow';
import { LoadError } from '../components/LoadError';
import { ScreenScroll } from '../components/ScreenScroll';
import {
  MONTH_WEEKS,
  homeSummary,
  monthChangePercent,
  records,
  sessionsBefore,
  weeklyVolume,
} from '../db/stats';
import type { RecordRow, WeekVolume } from '../db/stats';
import { isoDay, longDate, shiftDays } from '../lib/date';
import { br, plural, setLabel, volumeLabel } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { useApp } from '../state/AppStore';
import { usePlan } from '../state/usePlan';
import { useResponsive } from '../theme/layout';
import { themed, useColors, useSheet } from '../theme/theme';
import { type Palette, font, radius, tracking } from '../theme/tokens';
import { typeSheets } from '../theme/type';

type Props = {
  onStartWorkout: (workoutId: string) => void;
};

/** O gráfico mostra sete semanas; a oitava só existe para a variação do mês. */
const CHART_WEEKS = 7;

/**
 * A cor sai da altura da própria barra, não da posição. Assim a semana mais
 * forte é sempre a mais verde, mesmo quando a atual ainda está no começo.
 */
function barColor(height: number, colors: Palette): string {
  if (height >= 0.85) return colors.green;
  if (height >= 0.6) return colors.greenBar;
  if (height >= 0.35) return colors.greenMid;
  return colors.neutral400;
}

/** Em uma olhada: o que treinar hoje e o botão para começar. */
export function HomeScreen({ onStartWorkout }: Props) {
  const colors = useColors();
  const styles = useSheet(sheets);
  const type = useSheet(typeSheets);
  const { fs } = useResponsive();
  const { settings, openSession, revision } = useApp();
  const today = isoDay(new Date());

  const before = useAsync(() => sessionsBefore(today), 0, [today, revision]);
  const { planFor, today: todayPlan } = usePlan(() => before.data);
  const tomorrowPlan = planFor(isoDay(shiftDays(new Date(), 1)));

  const summary = useAsync(
    () => homeSummary(),
    { lastDay: null as string | null, doneThisWeek: 0 },
    [revision]
  );
  const volume = useAsync<WeekVolume[]>(() => weeklyVolume(MONTH_WEEKS), [], [revision]);
  const topRecords = useAsync<RecordRow[]>(() => records(1), [], [revision]);

  /** As sete semanas desenhadas; a mais antiga fica fora do gráfico. */
  const chartWeeks = useMemo(() => volume.data.slice(-CHART_WEEKS), [volume.data]);

  const bars = useMemo(() => {
    const peak = Math.max(1, ...chartWeeks.map((w) => w.volume));
    // Semana zerada ainda desenha um traço, para a barra não sumir da série.
    return chartWeeks.map((w) => ({
      ratio: w.volume === 0 ? 0.05 : Math.max(0.12, w.volume / peak),
      share: w.volume / peak,
    }));
  }, [chartWeeks]);

  /** A legenda só afirma o que os dados sustentam. */
  const volumeCaption = useMemo(() => {
    const weeks = chartWeeks;
    if (weeks.every((w) => w.volume === 0)) {
      return 'Sete semanas de volume. Registre um treino para começar a linha.';
    }
    const last = weeks[weeks.length - 1]?.volume ?? 0;
    const peak = Math.max(...weeks.map((w) => w.volume));
    if (last >= peak) return 'Sete semanas de volume. Esta é a sua maior.';
    // Só o fato: dizer "a semana ainda está começando" era falso no sábado.
    return `Sete semanas de volume. Melhor: ${volumeLabel(peak, settings.unit)}. Esta: ${volumeLabel(last, settings.unit)}.`;
  }, [chartWeeks, settings.unit]);

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

  /** Uma falha basta para o bloco ficar vazio; a linha explica por quê. */
  const loadError = summary.error ?? volume.error ?? topRecords.error ?? before.error;
  const retryAll = () => {
    summary.retry();
    volume.retry();
    topRecords.retry();
    before.retry();
  };

  const record = topRecords.data[0];
  const change = useMemo(() => monthChangePercent(volume.data), [volume.data]);
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

      {loadError && <LoadError message={loadError} onRetry={retryAll} />}

      {openSession && (
        <Pressable
          onPress={() => onStartWorkout(openSession.workout_id ?? plannedWorkout?.id ?? '')}
          accessibilityRole="button"
          accessibilityLabel="Retomar treino em andamento"
          style={styles.resume}
        >
          <View style={styles.resumeDot} />
          <View style={styles.resumeText}>
            <Text style={styles.resumeTitle}>Treino em andamento</Text>
            <Text style={styles.resumeMeta} numberOfLines={1}>
              {openSession.workout_title ?? 'Treino'} ·{' '}
              {plural(openSession.logged_sets, 'série registrada', 'séries registradas')}
            </Text>
          </View>
          <Text style={styles.resumeAction}>Retomar</Text>
        </Pressable>
      )}

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
          {bars.map((bar, i) => (
            <View
              key={i}
              style={[
                styles.bar,
                { height: `${bar.ratio * 100}%`, backgroundColor: barColor(bar.share, colors) },
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

const sheets = themed((colors, theme) =>
  StyleSheet.create({
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

    resume: {
      backgroundColor: colors.greenSoftBg,
      borderRadius: radius.card,
      paddingVertical: 14,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    resumeDot: {
      width: 9,
      height: 9,
      borderRadius: radius.pill,
      backgroundColor: colors.greenSurface,
      flexShrink: 0,
    },
    resumeText: { flex: 1, gap: 3 },
    resumeTitle: { fontFamily: font.semibold, fontSize: 15, lineHeight: 20, color: colors.green },
    resumeMeta: {
      fontFamily: font.regular,
      fontSize: 13,
      lineHeight: 17,
      color: colors.greenSoftText,
    },
    resumeAction: { fontFamily: font.semibold, fontSize: 14, lineHeight: 18, color: colors.green },

    todayCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.cardLg,
      padding: 24,
      gap: 20,
      boxShadow: theme.cardShadow,
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
      boxShadow: theme.cardShadow,
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
  })
);
