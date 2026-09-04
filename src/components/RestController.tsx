import { useCallback, useEffect, useRef, useState } from 'react';
import { alertRestOver } from '../lib/feedback';
import { RestBar } from './RestBar';
import { RestOverlay } from './RestOverlay';

type Props = {
  visible: boolean;
  /** Duração configurada no perfil, em segundos. */
  duration: number;
  nextLabel: string;
  onFinish: () => void;
};

/**
 * Dono do cronômetro de descanso.
 *
 * A contagem vive aqui para que a tela de execução não re-renderize a cada
 * segundo, e para que a barra e a versão em tela cheia mostrem sempre o mesmo
 * número. O padrão é a barra: o descanso não deve bloquear a tela.
 */
export function RestController({ visible, duration, nextLabel, onFinish }: Props) {
  const [remaining, setRemaining] = useState(duration);
  const [paused, setPaused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const deadline = useRef(0);

  // Cada abertura reinicia a contagem e volta ao formato reduzido.
  useEffect(() => {
    if (!visible) return;
    setRemaining(duration);
    setPaused(false);
    setExpanded(false);
    deadline.current = Date.now() + duration * 1000;
  }, [visible, duration]);

  useEffect(() => {
    if (!visible || paused) return;
    const id = setInterval(() => {
      const left = Math.round((deadline.current - Date.now()) / 1000);
      if (left <= 0) {
        clearInterval(id);
        // A pessoa não está olhando a tela: o aviso é no corpo.
        alertRestOver();
        onFinish();
      } else {
        setRemaining(left);
      }
    }, 250);
    return () => clearInterval(id);
  }, [visible, paused, onFinish]);

  const togglePause = useCallback(() => {
    setPaused((wasPaused) => {
      if (wasPaused) deadline.current = Date.now() + remaining * 1000;
      return !wasPaused;
    });
  }, [remaining]);

  const addThirty = useCallback(() => {
    deadline.current += 30_000;
    setRemaining((r) => r + 30);
  }, []);

  const expand = useCallback(() => setExpanded(true), []);
  const collapse = useCallback(() => setExpanded(false), []);

  if (!visible) return null;

  return (
    <>
      <RestBar
        seconds={remaining}
        paused={paused}
        nextLabel={nextLabel}
        onTogglePause={togglePause}
        onSkip={onFinish}
        onExpand={expand}
      />

      <RestOverlay
        visible={expanded}
        seconds={remaining}
        paused={paused}
        nextLabel={nextLabel}
        onTogglePause={togglePause}
        onAddThirty={addThirty}
        onSkip={onFinish}
        onCollapse={collapse}
      />
    </>
  );
}
