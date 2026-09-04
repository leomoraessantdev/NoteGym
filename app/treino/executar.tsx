import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBackOr } from '../../src/lib/navigation';
import { useApp } from '../../src/state/AppStore';
import { WorkoutExecutionScreen } from '../../src/screens/WorkoutExecutionScreen';

export default function ExecuteWorkoutRoute() {
  const router = useRouter();
  const { settings, workouts, refresh } = useApp();
  const { workoutId } = useLocalSearchParams<{ workoutId?: string }>();

  const id = workoutId ?? workouts[0]?.id;
  if (!id) return null;

  /**
   * Sair ou finalizar mudam o que o resto do app mostra: a faixa de treino em
   * andamento, o calendário, o progresso. Recarrega nos dois casos.
   */
  const leave = () => {
    void refresh();
    goBackOr(router, '/');
  };

  return (
    <WorkoutExecutionScreen
      workoutId={id}
      unit={settings.unit}
      restSeconds={settings.restSeconds}
      onExit={leave}
      onFinish={leave}
    />
  );
}
