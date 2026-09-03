import { Stack } from 'expo-router';
import { colors } from '../../../src/theme/tokens';

/** Criar/editar vive dentro da aba Treinos para manter o item ativo. */
export default function WorkoutsLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
    />
  );
}
