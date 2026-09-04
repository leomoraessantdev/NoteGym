import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Retorno físico dos gestos que importam.
 *
 * Na academia o celular quase sempre está fora do campo de visão, então o
 * toque é o canal principal. No web não existe háptico: as chamadas viram
 * no-op em vez de estourar.
 */
const supported = Platform.OS === 'ios' || Platform.OS === 'android';

const run = (fn: () => Promise<void>) => {
  if (!supported) return;
  fn().catch(() => {
    // Aparelho sem motor ou permissão negada não deve derrubar o fluxo.
  });
};

/** Série concluída: um toque curto e seco. */
export function tapConfirm(): void {
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** Desmarcar ou remover: mais leve, para não parecer uma confirmação. */
export function tapLight(): void {
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** Recorde batido. */
export function tapSuccess(): void {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/**
 * Descanso zerou. Três pulsos em sequência: a pessoa não está olhando a tela,
 * então um toque só passa despercebido.
 */
export function alertRestOver(): void {
  if (!supported) return;
  const pulse = (delay: number) =>
    setTimeout(() => {
      run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    }, delay);

  pulse(0);
  pulse(260);
  pulse(520);
}
