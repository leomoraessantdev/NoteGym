/**
 * A contagem do descanso, sem React e sem timer.
 *
 * Tudo aqui deriva de um instante do relógio em vez de acumular ticks. Na
 * academia o celular fica no bolso com a tela travada, e ali o `setInterval`
 * simplesmente para — um contador acumulado voltaria mentindo. Com a conta
 * feita a partir de `startedAt`, o número está certo no instante em que o app
 * reaparece, sem nada para ressincronizar.
 */

export type RestState = {
  /** Instante em que a contagem começou, em ms do relógio. */
  startedAt: number;
  /** Alvo em segundos. Sobe 30 a cada "+30s". */
  target: number;
  /** Segundos já contados quando pausou. `null` enquanto corre. */
  pausedAt: number | null;
};

export function startRest(now: number, target: number): RestState {
  return { startedAt: now, target, pausedAt: null };
}

/** Segundos corridos. Pausado, é o valor congelado. */
export function elapsedAt(state: RestState, now: number): number {
  if (state.pausedAt !== null) return state.pausedAt;
  return Math.max(0, Math.floor((now - state.startedAt) / 1000));
}

export function reachedTarget(state: RestState, now: number): boolean {
  return elapsedAt(state, now) >= state.target;
}

/** Quanto passou do alvo. Zero antes dele — nunca negativo. */
export function overtimeAt(state: RestState, now: number): number {
  return Math.max(0, elapsedAt(state, now) - state.target);
}

export function pause(state: RestState, now: number): RestState {
  if (state.pausedAt !== null) return state;
  return { ...state, pausedAt: elapsedAt(state, now) };
}

/**
 * Retomar recua o início pelo tanto que já tinha corrido. O tempo parado some
 * da conta sem precisar guardar quanto durou a pausa.
 */
export function resume(state: RestState, now: number): RestState {
  if (state.pausedAt === null) return state;
  return { startedAt: now - state.pausedAt * 1000, target: state.target, pausedAt: null };
}

export function addSeconds(state: RestState, extra: number): RestState {
  return { ...state, target: state.target + extra };
}

/** Instante em que o alvo vence, para o texto da notificação. `null` pausado. */
export function targetAt(state: RestState): number | null {
  if (state.pausedAt !== null) return null;
  return state.startedAt + state.target * 1000;
}

/**
 * Vibrar na tela só no segundo em que o alvo é cruzado, com o app à vista.
 *
 * Voltar do segundo plano entrega um salto grande de uma vez: ali o alvo venceu
 * faz tempo e a notificação agendada já avisou. Vibrar de novo seria um segundo
 * aviso, atrasado e sem motivo.
 */
export function shouldChime(previousElapsed: number, elapsed: number, target: number): boolean {
  return previousElapsed < target && elapsed >= target && elapsed - target < 2;
}
