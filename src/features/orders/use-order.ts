// Hooks de pedido. `useOrder` faz polling enquanto o status estiver "pending" — é a
// reconciliação REST que garante que, mesmo sem (ou antes de) o evento Socket.IO chegar, o
// cliente eventualmente descobre o resultado real da simulação. Nenhum dos dois hooks decide
// sozinho que um pedido foi confirmado: ambos só repetem o que o servidor mock disse.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useSession } from '@/features/auth/use-session'
import type { CreateOrderPayload } from '@/types/order'
import { createOrder, fetchOrder } from './api'
import { cartKey } from '@/features/cart/query-keys'

function orderKey(orderId: string) {
  return ['orders', orderId] as const
}

/** Uma chave de idempotência por "sessão de checkout": gerada uma única vez quando o
 *  formulário de pagamento é montado, e reaproveitada em qualquer reenvio (clique duplo,
 *  timeout seguido de nova tentativa) — nunca gerada de novo a cada clique. Isso é o que
 *  torna "impedir pedidos duplicados" uma garantia real, e não só um botão desabilitado. */
export function useIdempotencyKey(): string {
  const ref = useRef<string>(undefined)
  if (!ref.current) {
    ref.current = crypto.randomUUID()
  }
  return ref.current
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  const { user } = useSession()

  return useMutation({
    mutationFn: ({ idempotencyKey, payload }: { idempotencyKey: string; payload: CreateOrderPayload }) =>
      createOrder(idempotencyKey, payload),
    onSuccess: (order) => {
      queryClient.setQueryData(orderKey(order.id), order)
      // O carrinho só é alterado de verdade quando o pedido confirma (ver handler mock);
      // invalidar aqui garante que qualquer tela de carrinho aberta note a diferença assim
      // que isso acontecer, em vez de mostrar itens já comprados.
      queryClient.invalidateQueries({ queryKey: cartKey(user?.id) })
    },
  })
}

export function useOrder(orderId: string) {
  const queryClient = useQueryClient()
  const { user } = useSession()

  const query = useQuery({
    queryKey: orderKey(orderId),
    queryFn: () => fetchOrder(orderId),
    // Enquanto pendente, consulta de novo a cada segundo — é o mecanismo de reconciliação
    // REST. Ao chegar num estado terminal (confirmed/refused), para de consultar: pedidos
    // terminais não mudam mais (item 7 do desafio).
    refetchInterval: (activeQuery) => (activeQuery.state.data?.status === 'pending' ? 1000 : false),
  })

  // O pedido confirmar é o momento em que o carrinho muda no servidor (os itens comprados
  // saem de lá) — sem isto, o contador do carrinho no header ficaria desatualizado até a
  // próxima navegação que o revalidasse por acaso.
  useEffect(() => {
    if (query.data?.status === 'confirmed') {
      queryClient.invalidateQueries({ queryKey: cartKey(user?.id) })
    }
  }, [query.data?.status, queryClient, user?.id])

  return query
}
