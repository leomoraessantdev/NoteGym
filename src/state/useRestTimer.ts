import { useCallback, useEffect, useRef, useState } from 'react';
import { alertRestOver } from '../lib/feedback';
import {
  REST_ACTION_ADD,
  REST_ACTION_SKIP,
  cancelRestAlert,
  onRestAction,
  scheduleRestAlert,
} from '../lib/notifications';
import { hideRest, showRest } from '../lib/restNotification';
import {
  type RestState,
  addSeconds,
  elapsedAt,
  reachedTarget,
  overtimeAt,
  pause,
  resume,
  shouldChime,
  startRest,
  targetAt,
} from './restMath';

export type RestTimer = {
  /** Há descanso de pé. */
  active: boolean;
  /** Segundos corridos, contando para cima. */
  seconds: number;
  /** Alvo atual, já com os "+30s" aplicados. */
  target: number;
  /** Quanto passou do alvo. Zero antes dele. */
  overtime: number;
  paused: boolean;
  start: () => void;
  stop: () => void;
  togglePause: () => void;
  addThirty: () => void;
};

const clock = (at: number) =>
  new Date(at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const mmss = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/**
 * O descanso, de ponta a ponta.
 *
 * A conta é do `restMath`; aqui mora só o que tem efeito colateral: o relógio
 * que redesenha, o háptico do alvo e as duas notificações. Ele conta para cima
 * e não termina sozinho — passar do alvo avisa e segue contando, e só a pessoa
 * encerra. É isso que deixa o mesmo cronômetro servir de descanso e de
 * cronômetro livre.
 */
export function useRestTimer(target: number, notify: boolean): RestTimer {
  const [state, setState] = useState<RestState | null>(null);
  /** Só existe para redesenhar a cada tick; o valor não importa. */
  const [, setTick] = useState(0);

  /** O que a tela mostrava no tick anterior, para decidir a vibração. */
  const previousElapsed = useRef(0);

  /** A notificação de pé e o aviso agendado, para conseguir tirar os dois. */
  const ongoingId = useRef<string | null>(null);
  const alertId = useRef<string | null>(null);

  /**
   * Notificação é ida ao sistema: em fila, senão pausar e retomar rápido deixa
   * duas de pé ou tira a errada.
   */
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  /** Lido de dentro da fila: mudar a preferência no meio não reinicia nada. */
  const notifyRef = useRef(notify);
  notifyRef.current = notify;

  const syncNotifications = useCallback((next: RestState | null) => {
    queue.current = queue.current
      .then(async () => {
        await cancelRestAlert(alertId.current);
        alertId.current = null;
        await hideRest(ongoingId.current);
        ongoingId.current = null;

        if (!notifyRef.current || next === null) return;

        const now = Date.now();
        const endsAt = targetAt(next);

        ongoingId.current = await showRest({
          startedAt: next.startedAt,
          elapsed: elapsedAt(next, now),
          paused: next.pausedAt !== null,
          targetLabel: mmss(next.target),
          // Pausado não tem hora de vencimento; quem lê trata o vazio.
          endsAtLabel: endsAt === null ? '' : clock(endsAt),
        });

        // O aviso sonoro do alvo é separado do cronômetro: um conta, o outro
        // avisa. Pausado ou já vencido, não há o que agendar.
        if (endsAt === null || reachedTarget(next, now)) return;
        const seconds = Math.round((endsAt - now) / 1000);
        if (seconds > 0) alertId.current = await scheduleRestAlert(seconds);
      })
      .catch(() => undefined);
  }, []);

  const start = useCallback(() => {
    const next = startRest(Date.now(), target);
    previousElapsed.current = 0;
    setState(next);
    syncNotifications(next);
  }, [target, syncNotifications]);

  const stop = useCallback(() => {
    setState(null);
    syncNotifications(null);
  }, [syncNotifications]);

  const togglePause = useCallback(() => {
    setState((current) => {
      if (!current) return current;
      const now = Date.now();
      const next = current.pausedAt === null ? pause(current, now) : resume(current, now);
      syncNotifications(next);
      return next;
    });
  }, [syncNotifications]);

  const addThirty = useCallback(() => {
    setState((current) => {
      if (!current) return current;
      const next = addSeconds(current, 30);
      syncNotifications(next);
      return next;
    });
  }, [syncNotifications]);

  // Redesenha quatro vezes por segundo: o número troca no instante certo sem
  // depender de o timer ser pontual.
  useEffect(() => {
    if (!state || state.pausedAt !== null) return;
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [state]);

  // Sair do treino por qualquer caminho leva as notificações junto.
  useEffect(() => () => syncNotifications(null), [syncNotifications]);

  // Os botões da notificação trazem o app para a frente e caem aqui.
  useEffect(
    () =>
      onRestAction((action) => {
        if (action === REST_ACTION_SKIP) stop();
        if (action === REST_ACTION_ADD) addThirty();
      }),
    [stop, addThirty]
  );

  const now = Date.now();
  const seconds = state ? elapsedAt(state, now) : 0;
  const overtime = state ? overtimeAt(state, now) : 0;

  /** `null` quando não há descanso de pé. O parâmetro `target` é só o padrão. */
  const activeTarget = state?.target ?? null;

  // Num efeito, não no corpo: vibrar durante o render é efeito colateral em
  // render, e o React pode renderizar duas vezes — a vibração sairia dobrada.
  useEffect(() => {
    if (activeTarget === null) return;
    if (shouldChime(previousElapsed.current, seconds, activeTarget)) alertRestOver();
    previousElapsed.current = seconds;
  }, [seconds, activeTarget]);

  return {
    active: state !== null,
    seconds,
    target: activeTarget ?? target,
    overtime,
    paused: state?.pausedAt != null,
    start,
    stop,
    togglePause,
    addThirty,
  };
}
