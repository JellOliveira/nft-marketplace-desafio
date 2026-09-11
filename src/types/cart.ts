// Contratos do recurso "Carrinho" e "Cotação" (item 5 do desafio). Como os valores em ETH e
// as taxas de rede, o servidor mock é sempre a referência final para fechar o pedido — o
// cliente nunca calcula subtotal/total sozinho, só exibe o que a API devolveu.
export interface CartLine {
  nftId: string
  name: string
  tokenId: string
  imageUrl: string
  edition: string
  /** Preço unitário no momento da consulta — pode divergir do preço "no card" do catálogo se
   *  um evento de tempo real mudou o valor entre a adição e agora (ver item 7 do desafio). */
  priceEth: string
  quantity: number
  /** Quantidade disponível para esta edição, usada para desabilitar o "+" no estoque exato
   *  e para sinalizar quando a quantidade pedida excede o que ainda existe. */
  availableQuantity: number
}

export interface CartSummary {
  lines: CartLine[]
  /** Cupom aplicado nesta sessão de carrinho, se houver. */
  coupon: { code: string; discountPercent: number } | null
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalEth: string
  /** Incrementada a cada mutação do carrinho — a tela de pagamento usa isto para detectar
   *  cotação desatualizada e exigir nova confirmação (item 7 do desafio). */
  quoteVersion: number
}
