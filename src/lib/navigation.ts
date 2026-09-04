import type { useRouter } from 'expo-router';

type Router = ReturnType<typeof useRouter>;

/**
 * Volta uma tela, ou cai num destino conhecido.
 *
 * `router.back()` sozinho estoura ("GO_BACK was not handled") quando não há
 * histórico — abrir o app direto numa rota, recarregar o bundle, ou voltar de
 * uma tela que virou a primeira da pilha.
 */
export function goBackOr(router: Router, fallback: string): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}
