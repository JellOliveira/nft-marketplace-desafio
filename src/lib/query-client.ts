import { QueryClient } from '@tanstack/react-query'

// Instância única do TanStack Query compartilhada por toda a aplicação. Centralizar aqui
// (em vez de instanciar dentro de um componente) evita recriar o cache a cada render e
// permite que código fora da árvore React (ex.: handlers de evento do Socket.IO) também
// escreva no cache através do mesmo client.
//
// Política de cache/retries (documentada também em ARCHITECTURE.md):
// - staleTime moderado (30s) para reduzir refetches redundantes em navegação entre telas,
//   já que o catálogo/detalhe mudam por evento de tempo real, não por polling;
// - retry limitado a 1 tentativa: os cenários de falha do MSW devem ser visíveis ao usuário,
//   não mascarados por retries agressivos;
// - refetchOnWindowFocus desligado: evita refetch surpresa durante o fluxo de checkout.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})
