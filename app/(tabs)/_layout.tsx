import { Tabs } from 'expo-router';
import { TabBar } from '../../src/components/TabBar';
import { useColors } from '../../src/theme/theme';

/** Cinco itens fixos. A execução do treino fica fora das tabs — modo focado. */
export default function TabsLayout() {
  const colors = useColors();

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="treinos" options={{ title: 'Treinos' }} />
      <Tabs.Screen name="calendario" options={{ title: 'Calendário' }} />
      <Tabs.Screen name="progresso" options={{ title: 'Progresso' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
