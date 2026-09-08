import { type ReactNode, createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { type Palette, cardShadow, cardShadowDark, darkColors, lightColors } from './tokens';

/**
 * Tema claro e escuro.
 *
 * No React Native um `StyleSheet.create` no topo do módulo congela as cores no
 * carregamento: trocar os valores depois não repinta nada. Então cada folha é
 * montada uma vez por tema, com `themed`, e o componente escolhe a sua com
 * `useSheet` — a troca no sistema aparece na hora, sem reabrir o app.
 */
export type Scheme = 'light' | 'dark';

/**
 * O que a pessoa escolhe no perfil. `'system'` acompanha o aparelho; os outros
 * dois fixam o tema e ignoram o sistema.
 */
export type ThemePreference = 'system' | Scheme;

export type Theme = {
  scheme: Scheme;
  colors: Palette;
  /** Sombra de card, que no escuro precisa ser mais densa para existir. */
  cardShadow: string;
};

const THEMES: Record<Scheme, Theme> = {
  light: { scheme: 'light', colors: lightColors, cardShadow },
  dark: { scheme: 'dark', colors: darkColors, cardShadow: cardShadowDark },
};

const ThemeContext = createContext<Theme>(THEMES.light);

export function ThemeProvider({
  children,
  preference = 'system',
}: {
  children: ReactNode;
  /** Escolha do perfil. Sem valor, segue o sistema — o padrão do app. */
  preference?: ThemePreference;
}) {
  // `null` quer dizer que o sistema não opinou; claro é o padrão do app.
  const system = useColorScheme();
  const scheme: Scheme =
    preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  return (
    <ThemeContext.Provider value={THEMES[scheme]}>{children}</ThemeContext.Provider>
  );
}

export const useTheme = (): Theme => useContext(ThemeContext);
export const useColors = (): Palette => useTheme().colors;

/** As duas versões de uma folha de estilo, prontas no carregamento do módulo. */
export type Sheets<T> = Record<Scheme, T>;

export function themed<T>(make: (colors: Palette, theme: Theme) => T): Sheets<T> {
  return {
    light: make(THEMES.light.colors, THEMES.light),
    dark: make(THEMES.dark.colors, THEMES.dark),
  };
}

/** A folha do tema em uso. */
export function useSheet<T>(sheets: Sheets<T>): T {
  return sheets[useTheme().scheme];
}
