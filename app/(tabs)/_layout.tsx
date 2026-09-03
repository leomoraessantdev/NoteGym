import { Tabs } from 'expo-router';
import { TabBar } from '../../src/components/TabBar';
import { colors } from '../../src/theme/tokens';

/** Cinco itens fixos. A execução do treino fica fora das tabs — modo focado. */
export default function TabsLayout() {
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
