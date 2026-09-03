import { memo, useEffect, useRef, useState } from 'react';
import { Text, TextStyle } from 'react-native';
import { mmss } from '../lib/format';

type Props = {
  /** Segundos já decorridos quando a tela montou. */
  initialSeconds?: number;
  running?: boolean;
  style?: TextStyle;
};

/**
 * O cronômetro decorrido bate a cada segundo. Isolar o tick aqui evita
 * re-renderizar a tela de execução inteira 60 vezes por minuto.
 */
export const ElapsedClock = memo(function ElapsedClock({
  initialSeconds = 0,
  running = true,
  style,
}: Props) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const startedAt = useRef(Date.now() - initialSeconds * 1000);

  useEffect(() => {
    if (!running) return;
    // Deriva do relógio: não acumula erro se o timer atrasar ou o app suspender.
    const id = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  return <Text style={style}>{mmss(seconds)}</Text>;
});
