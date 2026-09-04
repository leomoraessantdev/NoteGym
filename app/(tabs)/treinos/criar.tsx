import { useRouter } from 'expo-router';
import { goBackOr } from '../../../src/lib/navigation';
import { CreateWorkoutScreen } from '../../../src/screens/CreateWorkoutScreen';

export default function CreateWorkoutRoute() {
  const router = useRouter();
  return <CreateWorkoutScreen onDone={() => goBackOr(router, '/treinos')} />;
}
