import type { ComponentProps } from 'react';
import type { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { themed, useColors, useSheet } from '../theme/theme';
import { font } from '../theme/tokens';
import { TabIcon, type TabIconName } from './TabIcon';

/** Ícone de 24 px + rótulo de 11 px. Ativo em verde, inativo em cinza claro. */
/** O tipo vem do proprio expo-router para nao divergir da versao instalada. */
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const colors = useColors();
  const styles = useSheet(sheets);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(22, insets.bottom) }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const active = state.index === index;
        const tint = active ? colors.green : colors.textDisabled;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!active && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
            style={styles.item}
          >
            <TabIcon name={route.name as TabIconName} color={tint} size={24} />
            <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const sheets = themed((colors) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 12,
      paddingHorizontal: 12,
      backgroundColor: colors.bg,
      borderTopWidth: 1,
      borderTopColor: colors.neutral300,
    },
    item: { flex: 1, alignItems: 'center', gap: 4 },
    label: { fontFamily: font.medium, fontSize: 11 },
  })
);

/** 1 de borda + 12 de topo + 43 do item (ícone 24, gap 4, rótulo 15). */
export const TAB_BAR_CONTENT_HEIGHT = 56;

/**
 * A altura real da tab bar, com a área segura embaixo. Vive aqui porque é este
 * arquivo que define os paddings — a conta solta noutro lugar fica desatualizada
 * no primeiro ajuste.
 */
export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_CONTENT_HEIGHT + Math.max(22, insets.bottom);
}
