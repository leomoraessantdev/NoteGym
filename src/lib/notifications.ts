import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Aviso de fim de descanso.
 *
 * Na academia o celular fica no bolso ou com a tela travada, e aí o cronômetro
 * para de contar junto — `setInterval` não roda em segundo plano. Uma
 * notificação local agendada para o fim do descanso é o que faz o aviso chegar
 * de verdade. São locais, não push: funcionam no Expo Go.
 *
 * No navegador nada disso existe; as funções viram no-op em vez de estourar.
 */
export const notificationsSupported = Platform.OS === 'ios' || Platform.OS === 'android';

const REST_CHANNEL = 'rest';

if (notificationsSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      // O som é o aviso; com o app na frente o háptico já dá o retorno.
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: false,
    }),
  });
}

let channelReady = false;

/** O Android só toca se o canal existir. Criar duas vezes é inofensivo. */
async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android' || channelReady) return;
  await Notifications.setNotificationChannelAsync(REST_CHANNEL, {
    name: 'Descanso',
    importance: Notifications.AndroidImportance.HIGH,
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
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;

    const asked = await Notifications.requestPermissionsAsync({
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
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Descanso terminou',
        body: 'Hora da próxima série.',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
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
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (error) {
    console.error('Falha ao cancelar o aviso de descanso', error);
  }
}
