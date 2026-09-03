import { useRouter } from 'expo-router';
import { WorkoutsScreen } from '../../../src/screens/WorkoutsScreen';

export default function WorkoutsRoute() {
  const router = useRouter();
  return <WorkoutsScreen onOpenEditor={() => router.push('/treinos/criar')} />;
}
