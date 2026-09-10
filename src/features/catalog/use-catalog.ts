// Hooks de consulta do catálogo. `useNftList` recebe os parâmetros já resolvidos da URL da
// rota (ver src/routes/index.tsx) — a própria URL é a fonte de verdade do que está sendo
// exibido, então o TanStack Query só precisa buscar o que ela descreve.
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchFeaturedNft, fetchNftDetail, fetchNftFacets, fetchNftList } from './api'
import { catalogKeys } from './query-keys'
import type { NftListParams } from '@/types/nft'

export function useNftList(params: NftListParams) {
  return useQuery({
    queryKey: catalogKeys.list(params),
    queryFn: ({ signal }) => fetchNftList(params, signal),
    // Mantém a página anterior visível enquanto a nova carrega, em vez de piscar para um
    // estado de loading a cada troca de filtro/página — e o AbortSignal acima garante que
    // uma resposta que chegou fora de ordem (filtro trocado de novo antes da 1ª responder)
    // seja descartada pelo próprio Query, sem sobrescrever um resultado mais recente.
    placeholderData: keepPreviousData,
  })
}

export function useNftFacets() {
  return useQuery({
    queryKey: catalogKeys.facets,
    queryFn: fetchNftFacets,
    staleTime: 5 * 60_000,
  })
}

export function useFeaturedNft() {
  return useQuery({
    queryKey: catalogKeys.featured,
    queryFn: fetchFeaturedNft,
    staleTime: 5 * 60_000,
  })
}

export function useNftDetail(id: string) {
  return useQuery({
    queryKey: catalogKeys.detail(id),
    queryFn: () => fetchNftDetail(id),
    retry: false,
  })
}
