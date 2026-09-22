import { ReactNode, useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActiveWorkout } from '../state/ActiveWorkout';
import { themed, useSheet } from '../theme/theme';
import { spacing } from '../theme/tokens';

type Props = {
  children: ReactNode;
  /** Espaço entre blocos da tela. */
  gap?: number;
  contentStyle?: ViewStyle;
};

/** Container padrão das telas com tab bar: padding lateral 22 e entrada fade + subida. */
export function ScreenScroll({ children, gap = spacing.block, contentStyle }: Props) {
  const styles = useSheet(sheets);
  const insets = useSafeAreaInsets();
  // Com o treino reduzido a barra flutua sobre a tela: sem esta folga o último
  // cartão fica embaixo dela e não dá para tocar.
  const { bottomInset } = useActiveWorkout();
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [enter]);

  return (
    <Animated.View
      style={[
        styles.root,
        {
          opacity: enter,
          transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
        },
      ]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { gap, paddingTop: insets.top + 16, paddingBottom: 32 + bottomInset },
          contentStyle,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </Animated.View>
  );
}

const sheets = themed((colors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { flex: 1 },
    content: {
      paddingHorizontal: spacing.screenX,
      paddingBottom: 32,
    },
  })
);
