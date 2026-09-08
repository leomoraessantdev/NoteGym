import { useCallback } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StartupError } from '../src/components/StartupError';
import { AppProvider, useApp } from '../src/state/AppStore';
import { ThemeProvider, useTheme } from '../src/theme/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  /**
   * Com a fonte carregada ou com o erro na mão, a tela entra. Esperar só o
   * sucesso deixava o app preto para sempre quando o download falhava — melhor
   * a fonte do sistema do que nada.
   */
  const ready = fontsLoaded || fontError !== null;

  const onLayout = useCallback(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <AppProvider>
        <ThemedApp onLayout={onLayout} />
      </AppProvider>
    </SafeAreaProvider>
  );
}

/**
 * O tema vem da preferência salva no perfil, então precisa ler o store — por
 * isso fica dentro do `AppProvider`. Enquanto o banco carrega vale o padrão
 * `'system'`, que acompanha o aparelho como antes.
 */
function ThemedApp({ onLayout }: { onLayout: () => void }) {
  const { settings } = useApp();
  return (
    <ThemeProvider preference={settings.theme}>
      <Shell onLayout={onLayout} />
    </ThemeProvider>
  );
}

/** Fundo e barra de status seguem o tema; a splash sai quando isto mede. */
function Shell({ onLayout }: { onLayout: () => void }) {
  const { colors, scheme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} onLayout={onLayout}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <AppBody />
    </View>
  );
}

/**
 * Dentro do provider: o banco pode ter falhado ao abrir, e nesse caso não faz
 * sentido mostrar as telas — elas diriam que a pessoa nunca treinou.
 */
function AppBody() {
  const { error, refresh } = useApp();
  const { colors } = useTheme();

  if (error) return <StartupError message={error} onRetry={() => void refresh()} />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="treino/executar" options={{ animation: 'fade' }} />
      <Stack.Screen name="treino/registro" />
    </Stack>
  );
}
