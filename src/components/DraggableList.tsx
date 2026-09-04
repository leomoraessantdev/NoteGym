import { ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';

type RenderArgs = {
  index: number;
  /** Handlers do punho de arraste — espalhe num Pressable/View. */
  handle: object;
  dragging: boolean;
};

type Props<T> = {
  items: T[];
  keyOf: (item: T, index: number) => string;
  /** Altura de uma linha, sem o espaço entre elas. */
  itemHeight: number;
  gap: number;
  onReorder: (from: number, to: number) => void;
  renderItem: (item: T, args: RenderArgs) => ReactNode;
};

/**
 * Lista reordenável por arraste.
 *
 * As linhas têm altura conhecida, então dá para saber em que posição o dedo
 * está sem medir nada: é o deslocamento dividido pelo passo. A linha arrastada
 * sobe de camada e as outras deslizam para abrir espaço.
 */
export function DraggableList<T>({
  items,
  keyOf,
  itemHeight,
  gap,
  onReorder,
  renderItem,
}: Props<T>) {
  const stride = itemHeight + gap;
  const [dragging, setDragging] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);

  /** Ref para o PanResponder ler o tamanho atual sem ser recriado. */
  const countRef = useRef(items.length);
  countRef.current = items.length;

  const translate = useRef(new Animated.Value(0)).current;

  /** Quantas posições o dedo já andou, limitado ao tamanho da lista. */
  const shiftFor = useCallback(
    (dy: number, from: number) => {
      const raw = Math.round(dy / stride);
      return Math.max(-from, Math.min(countRef.current - 1 - from, raw));
    },
    [stride]
  );

  const responders = useMemo(
    () =>
      items.map((_, index) =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 2,
          onPanResponderGrant: () => {
            setDragging(index);
            setOffset(0);
            translate.setValue(0);
          },
          onPanResponderMove: (_e, g) => {
            translate.setValue(g.dy);
            setOffset(shiftFor(g.dy, index));
          },
          onPanResponderRelease: (_e, g) => {
            const shift = shiftFor(g.dy, index);
            setDragging(null);
            setOffset(0);
            translate.setValue(0);
            if (shift !== 0) onReorder(index, index + shift);
          },
          onPanResponderTerminate: () => {
            setDragging(null);
            setOffset(0);
            translate.setValue(0);
          },
        })
      ),
    [items, onReorder, shiftFor, translate]
  );

  /** Para onde cada linha parada desliza enquanto outra é arrastada. */
  const slideFor = (index: number): number => {
    if (dragging === null || offset === 0 || index === dragging) return 0;
    const target = dragging + offset;
    if (dragging < target && index > dragging && index <= target) return -stride;
    if (dragging > target && index < dragging && index >= target) return stride;
    return 0;
  };

  return (
    <View style={{ gap }}>
      {items.map((item, index) => {
        const isDragging = dragging === index;
        return (
          <Animated.View
            key={keyOf(item, index)}
            style={[
              { height: itemHeight },
              isDragging
                ? [styles.lifted, { transform: [{ translateY: translate }] }]
                : { transform: [{ translateY: slideFor(index) }] },
            ]}
          >
            {renderItem(item, {
              index,
              handle: responders[index].panHandlers,
              dragging: isDragging,
            })}
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  lifted: { zIndex: 10, elevation: 10 },
});
