import { Stack } from 'expo-router';
import { useColors } from '../../../src/theme/theme';

/** Criar/editar vive dentro da aba Treinos para manter o item ativo. */
export default function WorkoutsLayout() {
  const colors = useColors();

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
  );
}
