import { HomeScreen } from '../../src/screens/HomeScreen';
import { useActiveWorkout } from '../../src/state/ActiveWorkout';

export default function HomeRoute() {
  // O treino não é mais uma rota: começar é acender a camada que vive acima da
  // navegação, e é isso que deixa a sessão sobreviver a trocar de aba.
  const { start } = useActiveWorkout();
  return <HomeScreen onStartWorkout={start} />;
}
