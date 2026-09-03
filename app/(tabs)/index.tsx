import { useRouter } from 'expo-router';
import { HomeScreen } from '../../src/screens/HomeScreen';

export default function HomeRoute() {
  const router = useRouter();
  return (
    <HomeScreen
      onStartWorkout={(workoutId) => router.push(`/treino/executar?workoutId=${workoutId}`)}
    />
  );
}
