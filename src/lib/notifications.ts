import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';

/**
 * Aviso de fim de descanso.
 *
 * Na academia o celular fica no bolso ou com a tela travada, e aí o cronômetro
 * para de contar junto — `setInterval` não roda em segundo plano. Uma
 * notificação local agendada para o fim do descanso é o que faz o aviso chegar
 * de verdade.
 *
 * `expo-notifications` foi tirado do Expo Go no Android a partir do SDK 53: só
 * de importar o módulo lá ele estoura. Por isso o import é preguiçoso e o
 * recurso fica desligado dentro do Expo Go — num development build ou no app
 * publicado ele volta a funcionar. No navegador as funções viram no-op em vez
 * de estourar.
 */
const inExpoGo = isRunningInExpoGo();

export const notificationsSupported =
  (Platform.OS === 'ios' || Platform.OS === 'android') && !inExpoGo;

const REST_CHANNEL = 'rest';

/**
 * `require`, não `import` estático: em Expo Go no Android o próprio módulo
 * estoura ao carregar. Só encostamos nele quando dá para usar de verdade, e o
 * handler é registrado uma vez nessa primeira carga.
 */
type NotificationsModule = typeof import('expo-notifications');

let mod: NotificationsModule | null = null;

function notifications(): NotificationsModule {
  if (!mod) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mod = require('expo-notifications') as NotificationsModule;
    mod.setNotificationHandler({
      handleNotification: async () => ({
        // O som é o aviso; com o app na frente o háptico já dá o retorno.
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: false,
      }),
    });
  }
  return mod;
}

let channelReady = false;

/** O Android só toca se o canal existir. Criar duas vezes é inofensivo. */
async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android' || channelReady) return;
  const N = notifications();
  await N.setNotificationChannelAsync(REST_CHANNEL, {
    name: 'Descanso',
    importance: N.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
  channelReady = true;
}

/**
 * Pede a permissão, se ainda não tiver. Devolve se pode notificar — quem chama
 * decide o que dizer ao usuário quando a resposta é não.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported) return false;

  try {
    const N = notifications();
    const current = await N.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;

    const asked = await N.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    return asked.granted;
  } catch (error) {
    console.error('Falha ao pedir permissão de notificação', error);
    return false;
  }
}

/**
 * Agenda o aviso para daqui a `seconds`. Devolve o identificador para cancelar
 * quando a pessoa pular o descanso, pausar, ou sair do treino antes da hora.
 */
export async function scheduleRestAlert(seconds: number): Promise<string | null> {
  if (!notificationsSupported || seconds <= 0) return null;

  try {
    await ensureChannel();
    const N = notifications();
    return await N.scheduleNotificationAsync({
      content: {
        title: 'Descanso terminou',
        body: 'Hora da próxima série.',
        sound: true,
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        channelId: REST_CHANNEL,
      },
    });
  } catch (error) {
    console.error('Falha ao agendar o aviso de descanso', error);
    return null;
  }
}

/** Cancelar um aviso que já disparou é no-op, então não precisa checar antes. */
export async function cancelRestAlert(id: string | null): Promise<void> {
  if (!notificationsSupported || !id) return;
  try {
    await notifications().cancelScheduledNotificationAsync(id);
  } catch (error) {
    console.error('Falha ao cancelar o aviso de descanso', error);
  }
}
