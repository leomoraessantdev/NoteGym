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

const REST_CATEGORY = 'rest';

/** Identificadores das ações — chegam de volta em `actionIdentifier`. */
export const REST_ACTION_SKIP = 'rest-skip';
export const REST_ACTION_ADD = 'rest-add-30';

let categoryReady = false;

/**
 * Botões na notificação.
 *
 * Os tipos de `expo-notifications` marcam `categoryIdentifier` como iOS, mas
 * o Android implementa: `ExpoNotificationBuilder` monta as ações a partir do
 * `categoryId`. Os dois botões trazem o app para a frente —
 * `opensAppToForeground: false` exigiria uma tarefa registrada em segundo
 * plano, frágil demais para dois toques.
 */
async function ensureCategory(): Promise<void> {
  if (categoryReady) return;
  const N = notifications();
  await N.setNotificationCategoryAsync(REST_CATEGORY, [
    { identifier: REST_ACTION_SKIP, buttonTitle: 'Pular' },
    { identifier: REST_ACTION_ADD, buttonTitle: '+30s' },
  ]);
  categoryReady = true;
}

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
        categoryIdentifier: REST_CATEGORY,
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

/**
 * Notificação que fica de pé enquanto o descanso corre.
 *
 * Mostra o horário em que o descanso vence, não um contador: um número que
 * corre sozinho na barra depende de `setUsesChronometer` do Android, ou seja,
 * módulo nativo. O horário-alvo resolve a mesma dúvida sem sair do JavaScript.
 */
export async function presentRestOngoing(endsAtLabel: string): Promise<string | null> {
  if (!notificationsSupported) return null;

  try {
    await ensureChannel();
    await ensureCategory();
    const N = notifications();
    return await N.scheduleNotificationAsync({
      content: {
        title: 'Descanso',
        body: `termina às ${endsAtLabel}`,
        categoryIdentifier: REST_CATEGORY,
        // Não sai com um deslize e não some ao tocar: quem tira é o fim do
        // descanso. Uma notificação de cronômetro que some sozinha mente.
        sticky: true,
        autoDismiss: false,
        sound: false,
      },
      trigger: null,
    });
  } catch (error) {
    console.error('Falha ao publicar o descanso em andamento', error);
    return null;
  }
}

export async function dismissRestOngoing(id: string | null): Promise<void> {
  if (!notificationsSupported || !id) return;
  try {
    await notifications().dismissNotificationAsync(id);
  } catch (error) {
    console.error('Falha ao tirar o descanso da barra', error);
  }
}

/**
 * Escuta os botões da notificação. Devolve a função que desliga a escuta.
 * Filtra pelo identificador da ação: tocar no corpo só abre o app.
 */
export function onRestAction(handler: (action: string) => void): () => void {
  if (!notificationsSupported) return () => {};

  try {
    const subscription = notifications().addNotificationResponseReceivedListener((response) => {
      const action = response.actionIdentifier;
      if (action === REST_ACTION_SKIP || action === REST_ACTION_ADD) handler(action);
    });
    return () => subscription.remove();
  } catch (error) {
    console.error('Falha ao escutar as ações do descanso', error);
    return () => {};
  }
}
