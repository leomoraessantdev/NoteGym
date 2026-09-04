import { useCallback, useEffect, useRef, useState } from 'react';
import { alertRestOver } from '../lib/feedback';
import { cancelRestAlert, scheduleRestAlert } from '../lib/notifications';
import { RestBar } from './RestBar';
import { RestOverlay } from './RestOverlay';

type Props = {
  /** Duração configurada no perfil, em segundos. */
  duration: number;
  nextLabel: string;
  /** Avisar por notificação, para o aviso chegar com a tela travada. */
  notify: boolean;
  onFinish: () => void;
};

/**
 * Dono do cronômetro de descanso.
 *
 * A contagem vive aqui para que a tela de execução não re-renderize a cada
 * segundo, e para que a barra e a versão em tela cheia mostrem sempre o mesmo
 * número. O padrão é a barra: o descanso não deve bloquear a tela.
 *
 * Roda enquanto estiver montado. Quem decide se há descanso é a tela, e é ela
 * que fixa a barra no topo — dentro da rolagem, o cronômetro sumia assim que a
 * pessoa descia para conferir a série anterior.
 */
export function RestController({ duration, nextLabel, notify, onFinish }: Props) {
  const [remaining, setRemaining] = useState(duration);
  const [paused, setPaused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const deadline = useRef(0);

  /**
   * O aviso agendado no sistema, que dispara mesmo com o app fechado. Vive em
   * paralelo à contagem da tela e é refeito sempre que o fim muda de hora.
   */
  const alertId = useRef<string | null>(null);
  const alertQueue = useRef<Promise<unknown>>(Promise.resolve());

  /** Agenda em fila: pausar e retomar rápido não deixa dois avisos de pé. */
  const rearmAlert = useCallback(
    (seconds: number | null) => {
      alertQueue.current = alertQueue.current
        .then(async () => {
          await cancelRestAlert(alertId.current);
          alertId.current = null;
          if (notify && seconds !== null && seconds > 0) {
            alertId.current = await scheduleRestAlert(seconds);
          }
        })
        .catch(() => undefined);
    },
    [notify]
  );

  // Cada abertura reinicia a contagem e volta ao formato reduzido.
  useEffect(() => {
    setRemaining(duration);
    setPaused(false);
    setExpanded(false);
    deadline.current = Date.now() + duration * 1000;
    rearmAlert(duration);
  }, [duration, rearmAlert]);

  // Sair do descanso por qualquer caminho leva o aviso junto.
  useEffect(() => () => rearmAlert(null), [rearmAlert]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const left = Math.round((deadline.current - Date.now()) / 1000);
      if (left <= 0) {
        clearInterval(id);
        // Com o app na frente o aviso é no corpo; a notificação cobre o resto.
        alertRestOver();
        rearmAlert(null);
        onFinish();
      } else {
        setRemaining(left);
      }
    }, 250);
    return () => clearInterval(id);
  }, [paused, onFinish, rearmAlert]);

  const togglePause = useCallback(() => {
    setPaused((wasPaused) => {
      if (wasPaused) {
        deadline.current = Date.now() + remaining * 1000;
        rearmAlert(remaining);
      } else {
        rearmAlert(null);
      }
      return !wasPaused;
    });
  }, [remaining, rearmAlert]);

  const addThirty = useCallback(() => {
    deadline.current += 30_000;
    setRemaining((r) => r + 30);
    rearmAlert(remaining + 30);
  }, [remaining, rearmAlert]);

  /** Pular também cancela o aviso: o descanso acabou por decisão da pessoa. */
  const skip = useCallback(() => {
    rearmAlert(null);
    onFinish();
  }, [rearmAlert, onFinish]);

  const expand = useCallback(() => setExpanded(true), []);
  const collapse = useCallback(() => setExpanded(false), []);

  return (
    <>
      <RestBar
        seconds={remaining}
        paused={paused}
        nextLabel={nextLabel}
        onTogglePause={togglePause}
        onSkip={skip}
        onExpand={expand}
      />

      <RestOverlay
        visible={expanded}
        seconds={remaining}
        paused={paused}
        nextLabel={nextLabel}
        onTogglePause={togglePause}
        onAddThirty={addThirty}
        onSkip={skip}
        onCollapse={collapse}
      />
    </>
  );
}
