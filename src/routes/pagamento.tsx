import { createFileRoute } from '@tanstack/react-router'

// Placeholder da tela de Pagamento — implementação completa (dados do colecionador, seleção
// de carteira/rede, revisão, idempotência e confirmação via Socket.IO) entra na próxima
// fase do plano, logo depois do catálogo/detalhe/carrinho estarem prontos.
export const Route = createFileRoute('/pagamento')({
  component: PaymentPlaceholder,
})

function PaymentPlaceholder() {
  return (
    <main className="mx-auto max-w-[1200px] px-5 py-10 lg:px-[120px]">
      <h1 className="text-lg font-bold text-brand-text">Pagamento</h1>
      <p className="mt-2 text-brand-muted">Em construção — próxima fase do plano.</p>
    </main>
  )
}
