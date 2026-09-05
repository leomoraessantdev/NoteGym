import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../components/BottomSheet';
import { Button } from '../components/Button';
import { PickerSheet } from '../components/PickerSheet';
import { ScreenScroll } from '../components/ScreenScroll';
import { TextSheet } from '../components/TextSheet';
import { type Backup, BackupError, backupFileName, describeBackup, parseBackup } from '../data/backup';
import { exportBackup, restoreBackup } from '../db/backup';
import { backupSupported, pickBackup, shareBackup } from '../lib/backupFile';
import { plural } from '../lib/format';
import { notificationsSupported, requestNotificationPermission } from '../lib/notifications';
import { useApp } from '../state/AppStore';
import { themed, useColors, useSheet } from '../theme/theme';
import { typeSheets } from '../theme/type';
import { font, radius } from '../theme/tokens';

/** Qual editor está aberto. */
type Editor = 'name' | 'goal' | 'unit' | 'daysPerWeek' | 'rest' | 'notifications' | null;

const GOALS = ['Hipertrofia', 'Força', 'Emagrecimento', 'Resistência', 'Saúde geral'];

/** 30 s a 4 min, de 15 em 15. */
const REST_CHOICES = Array.from({ length: 15 }, (_, i) => 30 + i * 15);

export function ProfileScreen() {
  const styles = useSheet(sheets);
  const type = useSheet(typeSheets);
  const { settings, updateSetting, setWeeklyTarget, refresh } = useApp();
  const [editor, setEditor] = useState<Editor>(null);
  /** O sistema recusou o aviso: a linha sozinha não explicaria por quê. */
  const [notificationsBlocked, setNotificationsBlocked] = useState(false);
  const close = () => setEditor(null);

  /** Uma operação de backup por vez, e o resultado sempre dito na tela. */
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  const [backupNote, setBackupNote] = useState<string | null>(null);
  /** Backup lido e conferido, esperando o usuário confirmar a troca. */
  const [pending, setPending] = useState<Backup | null>(null);

  /** Só a mensagem do erro conhecido chega ao usuário; o resto vira genérico. */
  const describeFailure = (failure: unknown) =>
    failure instanceof BackupError ? failure.message : 'Algo deu errado. Tente de novo.';

  const saveCopy = useCallback(async () => {
    setBackupNote(null);
    setBusy('export');
    try {
      const contents = await exportBackup();
      await shareBackup(contents, backupFileName(new Date().toISOString()));
    } catch (failure) {
      console.error('Falha ao exportar', failure);
      setBackupNote(describeFailure(failure));
    } finally {
      setBusy(null);
    }
  }, []);

  const chooseFile = useCallback(async () => {
    setBackupNote(null);
    setBusy('import');
    try {
      const contents = await pickBackup();
      // Confere o arquivo inteiro antes de oferecer a troca.
      if (contents !== null) setPending(parseBackup(contents));
    } catch (failure) {
      console.error('Falha ao ler o backup', failure);
      setBackupNote(describeFailure(failure));
    } finally {
      setBusy(null);
    }
  }, []);

  const confirmRestore = useCallback(async () => {
    if (!pending) return;
    const backup = pending;
    setPending(null);
    setBusy('import');
    try {
      await restoreBackup(backup);
      await refresh();
      setBackupNote('Pronto: o histórico do arquivo está no lugar.');
    } catch (failure) {
      console.error('Falha ao restaurar', failure);
      setBackupNote('A restauração não foi concluída. Seus dados continuam como estavam.');
    } finally {
      setBusy(null);
    }
  }, [pending, refresh]);

  /**
   * Ativar precisa da permissão do sistema. Sem ela o ajuste ficaria ligado
   * prometendo um aviso que nunca chega, então ele volta para desativado.
   */
  const chooseNotifications = useCallback(
    async (value: string) => {
      if (value !== 'Ativas') {
        setNotificationsBlocked(false);
        await updateSetting('notifications', value);
        return;
      }

      const granted = await requestNotificationPermission();
      setNotificationsBlocked(!granted);
      await updateSetting('notifications', granted ? 'Ativas' : 'Desativadas');
    },
    [updateSetting]
  );

  const rows: { key: Editor; label: string; value: string }[] = [
    { key: 'goal', label: 'Objetivo', value: settings.goal },
    { key: 'unit', label: 'Unidade de peso', value: settings.unit },
    {
      key: 'daysPerWeek',
      label: 'Meta semanal',
      value: plural(settings.daysPerWeek, 'treino', 'treinos'),
    },
    { key: 'rest', label: 'Descanso', value: `${settings.restSeconds} segundos` },
    { key: 'notifications', label: 'Notificações', value: settings.notifications },
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

        <View style={styles.backup}>
          <Text style={styles.sectionTitle}>Cópia de segurança</Text>
          <Text style={type.paragraph}>
            {backupSupported
              ? 'Seu histórico fica só neste aparelho. Guarde uma cópia de vez em quando.'
              : 'A cópia de segurança funciona no aplicativo do celular.'}
          </Text>

          <BackupAction
            label="Salvar uma cópia"
            hint="Gera um arquivo e abre onde salvar."
            busy={busy === 'export'}
            disabled={!backupSupported || busy !== null}
            onPress={() => void saveCopy()}
          />
          <BackupAction
            label="Restaurar de um arquivo"
            hint="Substitui o que está aqui pelo que estiver no arquivo."
            busy={busy === 'import'}
            disabled={!backupSupported || busy !== null}
            onPress={() => void chooseFile()}
          />

          {backupNote && <Text style={styles.backupNote}>{backupNote}</Text>}
        </View>

        {notificationsBlocked && (
          <Text style={styles.blocked}>
            O sistema não liberou os avisos. Autorize as notificações do NoteGym nos ajustes do
            aparelho e volte aqui.
          </Text>
        )}
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

      {/* Restaurar apaga o que está aqui: a confirmação diz o que entra no lugar. */}
      <BottomSheet
        visible={pending !== null}
        onClose={() => setPending(null)}
        title="Restaurar este backup?"
        subtitle={
          pending
            ? `O arquivo tem ${describeBackup(pending)} Tudo que está no aparelho agora será substituído.`
            : undefined
        }
      >
        <Button label="Manter o que está aqui" onPress={() => setPending(null)} height={56} />
        <Pressable
          onPress={() => void confirmRestore()}
          accessibilityRole="button"
          style={styles.restore}
        >
          <Text style={styles.restoreLabel}>Substituir pelo arquivo</Text>
        </Pressable>
      </BottomSheet>

      <PickerSheet
        visible={editor === 'goal'}
        title="Objetivo"
        subtitle="Fica no seu perfil. A sugestão de carga segue a faixa de repetições de cada exercício."
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
        subtitle="Ajusta os dias de treino no calendário também."
        options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({
          value: n,
          label: plural(n, 'treino', 'treinos'),
        }))}
        selected={settings.daysPerWeek}
        onSelect={(value) => void setWeeklyTarget(value)}
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
        subtitle={
          notificationsSupported
            ? 'Avisam o fim do descanso mesmo com a tela travada ou o app fechado.'
            : 'Só no celular. No navegador o aviso fica limitado à tela aberta.'
        }
        options={[
          { value: 'Ativas', label: 'Ativas' },
          { value: 'Desativadas', label: 'Desativadas' },
        ]}
        selected={settings.notifications}
        onSelect={(value) => void chooseNotifications(value)}
        onClose={close}
      />
    </>
  );
}

/** Linha de ação da cópia: rótulo, explicação e o estado de ocupado. */
function BackupAction({
  label,
  hint,
  busy,
  disabled,
  onPress,
}: {
  label: string;
  hint: string;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const styles = useSheet(sheets);
  const type = useSheet(typeSheets);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy }}
      style={[styles.backupRow, disabled && styles.backupRowOff]}
    >
      <View style={styles.backupText}>
        <Text style={styles.backupLabel}>{label}</Text>
        <Text style={type.metaSmall}>{hint}</Text>
      </View>
      {busy ? <ActivityIndicator color={colors.green} /> : <Text style={styles.chevron}>›</Text>}
    </Pressable>
  );
}

const sheets = themed((colors) =>
  StyleSheet.create({
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
    blocked: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.red },

    backup: { gap: 10 },
    sectionTitle: { fontFamily: font.semibold, fontSize: 18, color: colors.textPrimary },
    backupRow: {
      minHeight: 60,
      borderRadius: 18,
      paddingHorizontal: 18,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    backupRowOff: { opacity: 0.5 },
    backupText: { flex: 1, gap: 3 },
    backupLabel: { fontFamily: font.medium, fontSize: 16, color: colors.textPrimary },
    backupNote: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
    restore: { height: 52, alignItems: 'center', justifyContent: 'center' },
    restoreLabel: { fontFamily: font.semibold, fontSize: 15, color: colors.red },
  })
);
