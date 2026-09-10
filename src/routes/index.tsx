import { createFileRoute } from '@tanstack/react-router'

// Tela inicial (catálogo). Conteúdo provisório — a implementação completa (destaques,
// catálogo, busca, filtros, ordenação) entra na próxima fase, seguindo o layout em
// design-refs/Desktop/Início.png e design-refs/Mobile/Início.png.
export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <main className="mx-auto max-w-[1200px] px-5 py-10 lg:px-[120px]">
      <h1 className="text-2xl font-bold text-brand-text">NFT Marketplace</h1>
      <p className="mt-2 text-brand-muted">Roteamento configurado. Telas em construção.</p>
    </main>
  )
}
