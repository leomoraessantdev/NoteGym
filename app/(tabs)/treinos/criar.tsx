import { useRouter } from 'expo-router';
import { CreateWorkoutScreen } from '../../../src/screens/CreateWorkoutScreen';

export default function CreateWorkoutRoute() {
  const router = useRouter();
  return <CreateWorkoutScreen onDone={() => router.back()} />;
}
