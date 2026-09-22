import { requireOptionalNativeModule } from 'expo';

type NativeModule = {
  start: (startedAt: number, title: string, body: string, color: string) => void;
  freeze: (elapsed: number, title: string, body: string, color: string) => void;
  stop: () => void;
};

/**
 * Cronômetro que corre sozinho na barra de notificação.
 *
 * `requireOptionalNativeModule` porque o módulo só existe no Android e só num
 * build que o inclua: no Expo Go, na web e no iOS ele vem `null`, e quem chama
 * cai na notificação comum com o horário de término escrito.
 */
const native = requireOptionalNativeModule<NativeModule>('RestChronometer');

export const chronometerSupported = native !== null;

/** `startedAt` é relógio de parede em ms, como `Date.now()`. */
export function startChronometer(
  startedAt: number,
  title: string,
  body: string,
  color: string
): void {
  native?.start(startedAt, title, body, color);
}

/** `elapsed` em segundos: o número congela onde a pausa pegou. */
export function freezeChronometer(
  elapsed: number,
  title: string,
  body: string,
  color: string
): void {
  native?.freeze(elapsed, title, body, color);
}

export function stopChronometer(): void {
  native?.stop();
}
