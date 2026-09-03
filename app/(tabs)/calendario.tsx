import { useRouter } from 'expo-router';
import { CalendarScreen } from '../../src/screens/CalendarScreen';

export default function CalendarRoute() {
  const router = useRouter();
  return (
    <CalendarScreen
      onStartWorkout={(workoutId) => router.push(`/treino/executar?workoutId=${workoutId}`)}
    />
  );
}
