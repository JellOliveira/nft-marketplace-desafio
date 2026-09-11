// Contratos do recurso "Pedidos" (item 5 do desafio). O status de um pedido nunca é decidido
// pelo cliente — ele só reflete o que a simulação devolveu via REST (consulta) ou Socket.IO
// (evento `order.updated`, fase 6). É esse contrato que impede o eliminatório "compra
// confirmada sem resposta da simulação": a tela de confirmação só existe depois que
// `status` chega como "confirmed" vindo do servidor mock.
export type OrderStatus = 'pending' | 'confirmed' | 'refused'

export interface OrderLine {
  nftId: string
  name: string
  imageUrl: string
  edition: string
  quantity: number
  priceEth: string
}

export interface Order {
  id: string
  status: OrderStatus
  createdAt: string
  /** Incrementada a cada mudança de estado — usada para descartar eventos de tempo real
   *  antigos ou duplicados sobre o mesmo pedido (item 7 do desafio). */
  version: number
  lines: OrderLine[]
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalEth: string
  couponCode: string | null
  walletAddress: string
  walletType: string
  network: string
  /** Só populado quando status === "confirmed" — antes disso a transação não existe.
   *  Simulado: não aponta para um explorador de blocos real. */
  transactionHash: string | null
}

export interface CreateOrderPayload {
  walletAddress: string
  walletType: string
  network: string
  collectorName: string
  collectorEmail: string
  /** Aciona deterministicamente o cenário de pagamento recusado — usado para reproduzir o
   *  fluxo de falha em testes e na avaliação, sem depender de acaso (item 6 do desafio). */
  simulateRefusal: boolean
  /** Metadados opcionais do "Perfil do colecionador" preenchidos em /pagamento
   *  (design-refs/Código do Pagamento.html) — não fazem parte da identidade da conta (isso é
   *  /perfil e /carteiras), só acompanham este pedido específico. */
  username?: string
  ensName?: string | null
  profileNickname?: string | null
  ensOrSecondary?: string | null
  referralCode?: string | null
  note?: string | null
}
