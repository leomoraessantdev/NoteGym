import { useRouter } from 'expo-router';
import { CalendarScreen } from '../../src/screens/CalendarScreen';
import { useActiveWorkout } from '../../src/state/ActiveWorkout';

export default function CalendarRoute() {
  const router = useRouter();
  // Começar o treino acende a camada; abrir um registro antigo continua sendo
  // navegação comum.
  const { start } = useActiveWorkout();
  return (
    <CalendarScreen
      onStartWorkout={start}
      onOpenSession={(sessionId) => router.push(`/treino/registro?sessionId=${sessionId}`)}
    />
  );
}
