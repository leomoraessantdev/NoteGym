import { DependencyList, useEffect, useState } from 'react';

type AsyncState<T> = {
  data: T;
  loading: boolean;
};

/**
 * Consulta assíncrona com valor inicial. Descarta resultado de consulta antiga
 * quando as dependências mudam no meio do caminho.
 */
export function useAsync<T>(
  query: () => Promise<T>,
  initial: T,
  deps: DependencyList
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: initial, loading: true });

  useEffect(() => {
    let alive = true;
    setState((current) => ({ ...current, loading: true }));

    query()
      .then((data) => {
        if (alive) setState({ data, loading: false });
      })
      .catch((error) => {
        console.error('Consulta falhou', error);
        if (alive) setState((current) => ({ ...current, loading: false }));
      });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
