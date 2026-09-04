import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ListRow } from '../components/ListRow';
import { ScreenScroll } from '../components/ScreenScroll';
import { SegmentedControl } from '../components/SegmentedControl';
import { VolumeChart } from '../components/VolumeChart';
import { exerciseProgress, periodKpis, records, weeklyVolume } from '../db/stats';
import type { ExerciseProgress, PeriodKpis, RecordRow, WeekVolume } from '../db/stats';
import { longDate } from '../lib/date';
import { br, volumeLabel, weight, weightValue } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { useApp } from '../state/AppStore';
import { cardShadow, colors, font } from '../theme/tokens';
import { type } from '../theme/type';

const PERIODS = [
  { label: '4 semanas', weeks: 4 },
  { label: '3 meses', weeks: 13 },
  { label: '1 ano', weeks: 52 },
];

const EMPTY_KPIS: PeriodKpis = {
  volume: 0,
  sessions: 0,
  perWeek: 0,
  consistency: 0,
  topLoad: null,
};

export function ProgressScreen() {
  const { settings, revision } = useApp();
  const [period, setPeriod] = useState(0);
  const weeks = PERIODS[period].weeks;
  const chartWeeks = Math.min(weeks, 12);

  const kpis = useAsync<PeriodKpis>(
    () => periodKpis(weeks, settings.daysPerWeek),
    EMPTY_KPIS,
    [weeks, settings.daysPerWeek, revision]
  );
  const volume = useAsync<WeekVolume[]>(() => weeklyVolume(chartWeeks), [], [chartWeeks, revision]);
  const byExercise = useAsync<ExerciseProgress[]>(() => exerciseProgress(3), [], [revision]);
  const prs = useAsync<RecordRow[]>(() => records(5), [], [revision]);

  /** O gráfico recebe valores 0..1; o pico da janela vira o topo. */
  const series = useMemo(() => {
    const peak = Math.max(1, ...volume.data.map((w) => w.volume));
    return volume.data.map((w) => w.volume / peak);
  }, [volume.data]);

  const lastVolume = volume.data[volume.data.length - 1]?.volume ?? 0;
  const bestVolume = Math.max(0, ...volume.data.map((w) => w.volume));

  /**
   * A semana corrente quase sempre está pela metade, então a legenda fala da
   * melhor semana e só destaca a atual quando ela é a maior.
   */
  const chartCaption =
    kpis.data.volume === 0
      ? 'Sem treino registrado nesta janela ainda.'
      : lastVolume > 0 && lastVolume >= bestVolume
        ? `${volumeLabel(lastVolume, settings.unit)} nesta semana, o seu maior volume do período.`
        : `${volumeLabel(bestVolume, settings.unit)} na sua melhor semana. Esta semana está em ${volumeLabel(lastVolume, settings.unit)}.`;

  const rows = [
    { label: 'Volume no período', value: volumeLabel(kpis.data.volume, settings.unit), delta: '' },
    {
      label: 'Maior carga',
      value: kpis.data.topLoad ? weight(kpis.data.topLoad.kg, settings.unit) : '—',
      delta: kpis.data.topLoad?.name ?? '',
    },
    {
      label: 'Treinos feitos',
      value: String(kpis.data.sessions),
      delta: `${br(Math.round(kpis.data.perWeek * 10) / 10)} por semana`,
    },
    { label: 'Constância', value: `${kpis.data.consistency}%`, delta: `${weeks} semanas` },
  ];

  return (
    <ScreenScroll gap={26}>
      <Text style={type.screenTitle}>Progresso</Text>

      <SegmentedControl
        options={PERIODS.map((p) => p.label)}
        selectedIndex={period}
        onChange={setPeriod}
        height={36}
      />

      <View style={styles.chartBlock}>
        <Text style={type.bodyMuted}>Volume por semana</Text>
        <VolumeChart series={series} />
        <Text style={type.paragraph}>{chartCaption}</Text>
      </View>

      <View>
        {rows.map((row, i) => (
          <ListRow
            key={row.label}
            label={row.label}
            value={row.value}
            delta={row.delta || undefined}
            valueSize={19}
            paddingVertical={18}
            last={i === rows.length - 1}
          />
        ))}
      </View>

      {byExercise.data.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Por exercício</Text>
          {byExercise.data.map((item) => (
            <View key={item.exerciseId} style={styles.exerciseCard}>
              <View style={styles.exerciseText}>
                <Text style={type.cardTitle}>{item.name}</Text>
                <Text style={type.meta} numberOfLines={1}>
                  {item.loads.map((l) => weightValue(l, settings.unit)).join(' → ')}{' '}
                  {settings.unit}
                </Text>
              </View>
              {item.changePercent !== null && (
                <Text style={styles.exerciseDelta}>
                  {item.changePercent > 0 ? '+' : ''}
                  {br(item.changePercent)}%
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {prs.data.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seus recordes</Text>
          {prs.data.map((record, i) => (
            <View
              key={record.exerciseId}
              style={[styles.recordRow, i === prs.data.length - 1 && styles.recordLast]}
            >
              <View style={styles.recordText}>
                <Text style={styles.recordName}>{record.name}</Text>
                <Text style={type.metaSmall}>
                  {longDate(record.day)} · {record.reps} repetições
                </Text>
              </View>
              <Text style={styles.recordLoad}>{weight(record.kg, settings.unit)}</Text>
            </View>
          ))}
        </View>
      )}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  chartBlock: { gap: 16 },
  section: { gap: 14 },
  sectionTitle: { fontFamily: font.semibold, fontSize: 18, color: colors.textPrimary },

  exerciseCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    boxShadow: cardShadow,
  },
  exerciseText: { flex: 1, gap: 5 },
  exerciseDelta: { fontFamily: font.semibold, fontSize: 15, color: colors.green },

  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral300,
  },
  recordLast: { borderBottomWidth: 0, paddingBottom: 0 },
  recordText: { flex: 1, gap: 4 },
  recordName: { fontFamily: font.medium, fontSize: 16, color: colors.textPrimary },
  recordLoad: { fontFamily: font.semibold, fontSize: 17, color: colors.textPrimary },
});
