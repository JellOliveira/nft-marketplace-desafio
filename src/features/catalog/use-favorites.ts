// Favoritos com atualização otimista e rollback em falha — a interação escolhida para
// cumprir o item 4 do desafio ("Aplique atualização otimista em pelo menos uma interação,
// com rollback em caso de falha"). O card de NFT reage instantaneamente ao clique no
// coração; se a mutation falhar (ex.: sessão expirou no meio do clique), o estado anterior é
// restaurado e o usuário vê o coração voltar.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { userScope } from '@/features/auth/query-keys'
import { useSession } from '@/features/auth/use-session'
import { addFavorite, fetchFavorites, removeFavorite } from './api'

function favoritesKey(userId: string | null | undefined) {
  return ['favorites', userScope(userId)] as const
}

export function useFavorites() {
  const { user, isAuthenticated } = useSession()

  return useQuery({
    queryKey: favoritesKey(user?.id),
    queryFn: fetchFavorites,
    // Visitante não tem favoritos para buscar — a query fica pausada em vez de tentar e
    // levar um 401 esperado.
    enabled: isAuthenticated,
  })
}

export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const key = favoritesKey(user?.id)

  return useMutation({
    mutationFn: ({ nftId, isFavorited }: { nftId: string; isFavorited: boolean }) =>
      isFavorited ? removeFavorite(nftId) : addFavorite(nftId),

    onMutate: async ({ nftId, isFavorited }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<string[]>(key) ?? []

      const optimistic = isFavorited
        ? previous.filter((id) => id !== nftId)
        : [...previous, nftId]
      queryClient.setQueryData(key, optimistic)

      return { previous }
    },

    onError: (_error, _variables, context) => {
      // Rollback: falhou, então volta exatamente para a lista de antes do clique.
      if (context) queryClient.setQueryData(key, context.previous)
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key })
    },
  })
}
