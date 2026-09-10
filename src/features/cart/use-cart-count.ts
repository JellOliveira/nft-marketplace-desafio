import { useCart } from './use-cart'

// Contador de itens do carrinho exibido no ícone do header — soma as quantidades de todas as
// linhas do carrinho real (substituiu o placeholder inicial assim que o carrinho ficou
// disponível).
export function useCartCount(): number {
  const { data } = useCart()
  if (!data) return 0
  return data.lines.reduce((sum, line) => sum + line.quantity, 0)
}
