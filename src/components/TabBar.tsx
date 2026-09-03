import type { ComponentProps } from 'react';
import type { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, radius } from '../theme/tokens';

/** Ponto de 9 px + rótulo de 11 px. Ativo em verde, inativo em cinza claro. */
/** O tipo vem do proprio expo-router para nao divergir da versao instalada. */
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export function TabBar({ state, descriptors, navigation }: TabBarProps) {
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
            <View style={[styles.dot, { backgroundColor: tint }]} />
            <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.neutral300,
  },
  item: { flex: 1, alignItems: 'center', gap: 6 },
  dot: { width: 9, height: 9, borderRadius: radius.pill },
  label: { fontFamily: font.medium, fontSize: 11 },
});
