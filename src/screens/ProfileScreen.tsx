import { StyleSheet, Text, View } from 'react-native';
import { ListRow } from '../components/ListRow';
import { ScreenScroll } from '../components/ScreenScroll';
import { useApp } from '../state/AppStore';
import { colors, font, radius } from '../theme/tokens';

export function ProfileScreen() {
  const { settings } = useApp();

  const rows = [
    { label: 'Objetivo', value: settings.goal },
    { label: 'Unidade de peso', value: settings.unit },
    { label: 'Dias de treino', value: `${settings.daysPerWeek} por semana` },
    { label: 'Calendário', value: settings.calendarMode === 'fixed' ? 'Dias fixos' : 'Na sequência' },
    { label: 'Descanso', value: `${settings.restSeconds} segundos` },
    { label: 'Notificações', value: settings.notifications },
    { label: 'Conta', value: settings.accountEmail || 'sem conta' },
  ];

  return (
    <ScreenScroll>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.initial}>{settings.profileName[0] ?? '?'}</Text>
        </View>
        <View style={styles.identityText}>
          <Text style={styles.name}>{settings.profileName}</Text>
          <Text style={styles.tagline}>
            {settings.goal} · {settings.daysPerWeek} treinos por semana
          </Text>
        </View>
      </View>

      <View>
        {rows.map((row, i) => (
          <ListRow
            key={row.label}
            label={row.label}
            value={row.value}
            valueSize={15}
            labelSize={16}
            invert
            paddingVertical={19}
            last={i === rows.length - 1}
          />
        ))}
      </View>
    </ScreenScroll>
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
});
