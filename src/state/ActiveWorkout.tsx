import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';

/** Altura da barra reduzida. As telas reservam este espaço no fim da rolagem. */
export const MINI_BAR_HEIGHT = 64;

type ActiveWorkout = {
  /** Treino em andamento, ou null quando não há sessão aberta. */
  workoutId: string | null;
  minimized: boolean;
  /** Espaço a somar no fim das telas para o último cartão não sumir. */
  bottomInset: number;
  start: (workoutId: string) => void;
  minimize: () => void;
  expand: () => void;
  close: () => void;
};

const Context = createContext<ActiveWorkout | null>(null);

/**
 * Qual treino está aberto, e se está reduzido.
 *
 * É só isso: o estado da sessão em si — séries, cronômetro, tempo decorrido —
 * mora na camada que este provider desenha. Separar os dois é o que deixa a
 * camada remontar ao trocar de treino sem levar o provider junto.
 */
export function ActiveWorkoutProvider({ children }: { children: ReactNode }) {
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);

  const start = useCallback((id: string) => {
    setWorkoutId(id);
    setMinimized(false);
  }, []);

  const minimize = useCallback(() => setMinimized(true), []);
  const expand = useCallback(() => setMinimized(false), []);

  const close = useCallback(() => {
    setWorkoutId(null);
    setMinimized(false);
  }, []);

  const value = useMemo<ActiveWorkout>(
    () => ({
      workoutId,
      minimized,
      bottomInset: workoutId && minimized ? MINI_BAR_HEIGHT : 0,
      start,
      minimize,
      expand,
      close,
    }),
    [workoutId, minimized, start, minimize, expand, close]
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useActiveWorkout(): ActiveWorkout {
  const value = useContext(Context);
  if (!value) throw new Error('useActiveWorkout precisa estar dentro de ActiveWorkoutProvider');
  return value;
}
