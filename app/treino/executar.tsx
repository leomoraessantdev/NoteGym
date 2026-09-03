import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../../src/state/AppStore';
import { WorkoutExecutionScreen } from '../../src/screens/WorkoutExecutionScreen';

export default function ExecuteWorkoutRoute() {
  const router = useRouter();
  const { settings, workouts, refresh } = useApp();
  const { workoutId } = useLocalSearchParams<{ workoutId?: string }>();

  const id = workoutId ?? workouts[0]?.id;
  if (!id) return null;

  const leave = () => router.back();

  return (
    <WorkoutExecutionScreen
      workoutId={id}
      unit={settings.unit}
      restSeconds={settings.restSeconds}
      onExit={leave}
      onFinish={() => {
        // O treino gravado muda Início, Calendário e Progresso.
        void refresh();
        leave();
      }}
    />
  );
}
