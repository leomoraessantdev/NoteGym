import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { ScreenScroll } from '../components/ScreenScroll';
import { SegmentedControl } from '../components/SegmentedControl';
import { ScheduleSheet } from '../components/ScheduleSheet';
import { DayState, buildMonth, seqHint } from '../data/calendar';
import { describeSchedule } from '../db/schedule';
import { daySummary, sessionsBefore, trainedDays } from '../db/stats';
import type { DaySummary } from '../db/stats';
import { isoDay, longDate, monthTitle } from '../lib/date';
import { plural, volumeLabel } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { useApp } from '../state/AppStore';
import { usePlan } from '../state/usePlan';
import { cardShadow, colors, font, radius, tracking } from '../theme/tokens';
import { type } from '../theme/type';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MODES = ['Dias fixos', 'Na sequência'];

const DAY_STYLE: Record<DayState, { bg: string; fg: string; border: string }> = {
  done: { bg: colors.green, fg: colors.onGreen, border: colors.green },
  today: { bg: colors.surface, fg: colors.green, border: colors.green },
  planned: { bg: colors.greenMid, fg: colors.greenDeep, border: colors.greenMid },
  rest: { bg: colors.neutral200, fg: colors.dayRestText, border: colors.neutral200 },
};

const LEGEND = [
  { color: colors.green, label: 'Treinou' },
  { color: colors.greenMid, label: 'Planejado' },
  { color: colors.neutral200, label: 'Descanso' },
];

type Props = {
  onStartWorkout: (workoutId: string) => void;
  onOpenSession: (sessionId: string) => void;
};

/** Ver o mês, entender o que já foi feito e abrir o dia. */
export function CalendarScreen({ onStartWorkout, onOpenSession }: Props) {
  const { settings, schedule, workouts, setMode, setScheduleDay, createNamedWorkout, revision } =
    useApp();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selectedIso, setSelectedIso] = useState(isoDay(now));

  const monthStart = isoDay(new Date(cursor.year, cursor.month, 1));
  const monthEnd = isoDay(new Date(cursor.year, cursor.month + 1, 0));

  const trained = useAsync<string[]>(
    () => trainedDays(monthStart, monthEnd),
    [],
    [monthStart, monthEnd, revision]
  );
  const before = useAsync(() => sessionsBefore(selectedIso), 0, [selectedIso, revision]);
  const summary = useAsync<DaySummary | null>(
    () => daySummary(selectedIso),
    null,
    [selectedIso, revision]
  );

  const trainedSet = useMemo(() => new Set(trained.data), [trained.data]);
  const cells = useMemo(
    () => buildMonth(cursor.year, cursor.month, trainedSet, settings.calendarMode, schedule),
    [cursor.year, cursor.month, trainedSet, settings.calendarMode, schedule]
  );

  const { planFor } = usePlan(() => before.data);
  const plan = planFor(selectedIso);
  const selectedCell = cells.find((c) => c.iso === selectedIso);
  const state: DayState = selectedCell?.state ?? 'planned';

  const step = useCallback((delta: number) => {
    setCursor((current) => {
      const date = new Date(current.year, current.month + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  }, []);

  const description = describeDay(
    state,
    summary.data,
    plan.workout?.exercise_count ?? 0,
    settings.unit
  );
  const action = actionForDay(state, plan.workout !== null, summary.data !== null);

  return (
    <ScreenScroll gap={22}>
      <View style={styles.header}>
        <Text style={styles.month}>{monthTitle(cursor.month)}</Text>
        <View style={styles.nav}>
          <NavButton glyph="‹" label="Mês anterior" onPress={() => step(-1)} />
          <NavButton glyph="›" label="Próximo mês" onPress={() => step(1)} />
        </View>
      </View>

      <View style={styles.modeBlock}>
        <SegmentedControl
          options={MODES}
          selectedIndex={settings.calendarMode === 'fixed' ? 0 : 1}
          onChange={(i) => void setMode(i === 0 ? 'fixed' : 'seq')}
        />
        {settings.calendarMode === 'fixed' ? (
          <View style={styles.hintRow}>
            <Text style={[type.paragraph, styles.hintText]}>{describeSchedule(schedule)}</Text>
            <Pressable
              onPress={() => setScheduleOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Editar dias de treino"
              hitSlop={8}
            >
              <Text style={styles.editLink}>Editar</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={type.paragraph}>{seqHint}</Text>
        )}
      </View>

      <View style={styles.grid}>
        {WEEKDAYS.map((letter, i) => (
          <View key={`wd-${i}`} style={styles.headerCell}>
            <Text style={styles.weekday}>{letter}</Text>
          </View>
        ))}

        {cells.map((cell, i) => {
          if (cell.day === null) return <View key={`blank-${i}`} style={styles.cell} />;
          const palette = DAY_STYLE[cell.state];
          const isSelected = cell.iso === selectedIso;
          return (
            <Pressable
              key={cell.iso}
              style={styles.cell}
              onPress={() => setSelectedIso(cell.iso)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Dia ${cell.day}`}
            >
              <View
                style={[
                  styles.dayCircle,
                  {
                    backgroundColor: palette.bg,
                    borderColor: isSelected ? colors.textPrimary : palette.border,
                    borderWidth: isSelected ? 2 : 1.5,
                  },
                ]}
              >
                <Text style={[styles.dayNumber, { color: palette.fg }]}>{cell.day}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legend}>
        {LEGEND.map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.dayCard}>
        <View style={styles.dayCardText}>
          <Text style={type.meta}>{longDate(selectedIso)}</Text>
          <Text style={styles.dayCardTitle}>
            {summary.data?.workoutTitle ?? plan.workout?.title ?? 'Descanso'}
          </Text>
          <Text style={styles.dayCardBody}>{description}</Text>
        </View>

        {action && (
          <Button
            label={action.label}
            variant={action.primary ? 'primary' : 'secondary'}
            height={52}
            onPress={() => {
              if (action.opensRecord && summary.data) onOpenSession(summary.data.sessionId);
              else if (plan.workout) onStartWorkout(plan.workout.id);
            }}
          />
        )}
      </View>

      <ScheduleSheet
        visible={scheduleOpen}
        schedule={schedule}
        workouts={workouts}
        onPick={(weekday, workoutId) => void setScheduleDay(weekday, workoutId)}
        onCreateWorkout={createNamedWorkout}
        onClose={() => setScheduleOpen(false)}
      />
    </ScreenScroll>
  );
}

/** O texto do card sai do que foi registrado; sem registro, do plano. */
function describeDay(
  state: DayState,
  summary: DaySummary | null,
  exercises: number,
  unit: string
): string {
  if (summary) {
    const duration = summary.minutes
      ? ` Durou ${plural(summary.minutes, 'minuto', 'minutos')}.`
      : '';
    return (
      `${plural(summary.exercises, 'exercício', 'exercícios')}, ` +
      `${plural(summary.sets, 'série', 'séries')}, ` +
      `${volumeLabel(summary.volume, unit)} no total.${duration}`
    );
  }
  if (state === 'rest') return 'Dia livre. Se quiser, você pode registrar um treino avulso.';
  const planned = `${plural(exercises, 'exercício', 'exercícios')}, cerca de ${exercises * 10} minutos`;
  if (state === 'today') return `${planned}. As cargas já estão sugeridas.`;
  return `${planned}.`;
}

function actionForDay(state: DayState, hasWorkout: boolean, hasRecord: boolean) {
  // Dia já treinado abre o que foi feito; o resto leva para a execução.
  if (hasRecord) return { label: 'Ver o que você fez', primary: false, opensRecord: true };
  if (!hasWorkout) return null;
  if (state === 'today') return { label: 'Começar treino', primary: true, opensRecord: false };
  if (state === 'planned') return { label: 'Fazer hoje mesmo', primary: false, opensRecord: false };
  return null;
}

function NavButton({
  glyph,
  label,
  onPress,
}: {
  glyph: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.navButton}
    >
      <Text style={styles.navGlyph}>{glyph}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  month: {
    fontFamily: font.semibold,
    fontSize: 24,
    lineHeight: 29,
    letterSpacing: tracking(-0.02, 24),
    color: colors.textPrimary,
  },
  nav: { flexDirection: 'row', gap: 8 },
  navButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navGlyph: { fontFamily: font.medium, fontSize: 16, color: colors.textSecondary },

  modeBlock: { gap: 10 },
  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  hintText: { flex: 1 },
  editLink: { fontFamily: font.semibold, fontSize: 14, color: colors.green, paddingTop: 1 },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  /** 1/7 da largura com 4 px de folga de cada lado — dá os 8 px de gap do handoff. */
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 4 },
  /** O cabeçalho não é quadrado: senão abre um vão entre as letras e o dia 1. */
  headerCell: {
    width: `${100 / 7}%`,
    paddingHorizontal: 4,
    paddingBottom: 8,
    alignItems: 'center',
  },
  weekday: {
    fontFamily: font.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textTertiary,
  },
  dayCircle: {
    flex: 1,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: { fontFamily: font.medium, fontSize: 15 },

  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 12, height: 12, borderRadius: radius.pill },
  legendLabel: { fontFamily: font.regular, fontSize: 13, color: colors.textSecondary },

  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 22,
    gap: 16,
    boxShadow: cardShadow,
  },
  dayCardText: { gap: 6 },
  dayCardTitle: {
    fontFamily: font.semibold,
    fontSize: 22,
    lineHeight: 26,
    color: colors.textPrimary,
  },
  dayCardBody: {
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
});
