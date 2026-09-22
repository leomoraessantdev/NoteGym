import {
  chronometerSupported,
  freezeChronometer,
  startChronometer,
  stopChronometer,
} from '../../modules/rest-chronometer';
import { lightColors } from '../theme/tokens';
import { dismissRestOngoing, presentRestOngoing } from './notifications';

/** O que a barra de notificação precisa saber sobre o descanso. */
export type RestView = {
  /** Relógio de parede, em ms, de quando a contagem começou. */
  startedAt: number;
  /** Segundos corridos. Só importa pausado, para congelar no lugar certo. */
  elapsed: number;
  paused: boolean;
  /** "1:30" — o alvo, escrito. */
  targetLabel: string;
  /** "14:32" — a hora em que o alvo vence. */
  endsAtLabel: string;
};

/**
 * O verde do app. Vem da paleta clara porque o valor é o mesmo nos dois temas,
 * e a notificação segue o tema do sistema, não o do app.
 */
const TINT = lightColors.greenSurface;

/**
 * Mostra o descanso na barra, do melhor jeito que o aparelho permitir.
 *
 * Com o módulo nativo, um cronômetro de verdade: a SystemUI conta o número
 * sozinha, então ele segue correndo com o app fechado. Sem ele — iOS, web,
 * Expo Go — sobra a notificação fixa com o horário de término escrito, que
 * responde a mesma pergunta sem correr.
 *
 * Devolve o identificador da notificação fixa, ou null quando quem está de pé
 * é o cronômetro nativo.
 */
export async function showRest(view: RestView): Promise<string | null> {
  if (chronometerSupported) {
    const body = `alvo ${view.targetLabel}`;
    if (view.paused) freezeChronometer(view.elapsed, 'Descanso pausado', body, TINT);
    else startChronometer(view.startedAt, 'Descanso', body, TINT);
    return null;
  }

  // Pausado não tem hora de término para anunciar, e um horário congelado seria
  // pior do que notificação nenhuma.
  if (view.paused) return null;
  return presentRestOngoing(view.endsAtLabel);
}

/** Tira as duas formas, sem precisar saber qual estava de pé. */
export async function hideRest(handle: string | null): Promise<void> {
  if (chronometerSupported) stopChronometer();
  await dismissRestOngoing(handle);
}
