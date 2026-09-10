// Hooks do carrinho. As mutations não são otimistas (ao contrário de favoritos): preço e
// disponibilidade têm que vir confirmados pelo servidor antes de atualizar a tela — é
// exatamente a garantia que o item 3 do desafio pede para o carrinho ("Refletir alterações
// de preço e disponibilidade recebidas enquanto o carrinho estiver aberto"), então cada
// mutação espera a resposta real em vez de assumir sucesso.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/features/auth/use-session'
import type { CartSummary } from '@/types/cart'
import {
  addCartItem,
  applyCoupon,
  fetchCart,
  removeCartItem,
  removeCoupon,
  updateCartItem,
} from './api'
import { cartKey } from './query-keys'

export function useCart() {
  const { user } = useSession()
  return useQuery({
    queryKey: cartKey(user?.id),
    queryFn: fetchCart,
  })
}

function useCartMutation<TArgs>(mutationFn: (args: TArgs) => Promise<CartSummary>) {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const key = cartKey(user?.id)

  return useMutation({
    mutationFn,
    onSuccess: (data) => queryClient.setQueryData(key, data),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

export function useAddCartItem() {
  return useCartMutation(addCartItem)
}

export function useUpdateCartItem() {
  return useCartMutation(updateCartItem)
}

export function useRemoveCartItem() {
  return useCartMutation(removeCartItem)
}

export function useApplyCoupon() {
  return useCartMutation(applyCoupon)
}

export function useRemoveCoupon() {
  return useCartMutation(removeCoupon)
}
