import { DependencyList, useCallback, useEffect, useState } from 'react';

type AsyncState<T> = {
  data: T;
  loading: boolean;
  /** Mensagem quando a consulta falhou. A tela precisa poder dizer. */
  error: string | null;
};

type AsyncResult<T> = AsyncState<T> & {
  /** Refaz a consulta. Ligado ao botão de tentar de novo. */
  retry: () => void;
};

/**
 * Consulta assíncrona com valor inicial. Descarta resultado de consulta antiga
 * quando as dependências mudam no meio do caminho.
 *
 * A falha vira estado, não só uma linha no console: uma leitura que quebra
 * deixava a tela vazia, indistinguível de quem ainda não treinou.
 */
export function useAsync<T>(
  query: () => Promise<T>,
  initial: T,
  deps: DependencyList
): AsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: initial,
    loading: true,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    setState((current) => ({ ...current, loading: true }));

    query()
      .then((data) => {
        if (alive) setState({ data, loading: false, error: null });
      })
      .catch((failure) => {
        console.error('Consulta falhou', failure);
        if (alive) {
          setState((current) => ({
            ...current,
            loading: false,
            error: 'Não deu para ler seus dados agora.',
          }));
        }
      });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  return { ...state, retry };
}
