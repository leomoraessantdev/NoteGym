import { useLocalSearchParams, useRouter } from 'expo-router';
import { SessionDetailScreen } from '../../src/screens/SessionDetailScreen';
import { useApp } from '../../src/state/AppStore';

export default function SessionRecordRoute() {
  const router = useRouter();
  const { settings, refresh } = useApp();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();

  if (!sessionId) return null;

  return (
    <SessionDetailScreen
      sessionId={sessionId}
      unit={settings.unit}
      onDone={() => {
        // Correções mexem no histórico, nos recordes e no progresso.
        void refresh();
        router.back();
      }}
    />
  );
}
