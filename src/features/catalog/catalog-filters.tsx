// Barra lateral de filtros (design-refs/Desktop/Início.png): coleções (categoria), faixa de
// preço e rede. Filtros são combináveis — vários podem estar ativos ao mesmo tempo — e cada
// mudança aqui reinicia a paginação para a página 1 (feito pelo componente pai, que possui o
// estado da URL; este componente só emite a intenção de mudança).
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import type { CategoryFacet, NetworkFacet, NftNetwork, PriceBounds } from '@/types/nft'
import { FeaturedNftCard } from './featured-nft-card'

const NETWORK_LABELS: Record<NftNetwork, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

interface CatalogFiltersProps {
  categories: CategoryFacet[]
  networks: NetworkFacet[]
  selectedCategory: string | null
  selectedNetwork: NftNetwork | null
  priceMin: number | null
  priceMax: number | null
  priceBounds: PriceBounds | undefined
  onCategoryChange: (category: string | null) => void
  onNetworkChange: (network: NftNetwork | null) => void
  onPriceChange: (min: number | null, max: number | null) => void
}

export function CatalogFilters({
  categories,
  networks,
  selectedCategory,
  selectedNetwork,
  priceMin,
  priceMax,
  priceBounds,
  onCategoryChange,
  onNetworkChange,
  onPriceChange,
}: CatalogFiltersProps) {
  return (
    <aside className="w-full shrink-0 lg:w-[240px]" aria-label="Filtros do catálogo">
      <div className="rounded-xl bg-brand-card p-5">
        <section>
          <h2 className="mb-3 text-lg font-bold text-brand-text">Coleções</h2>
          <ul className="flex flex-col gap-2">
            {categories.map((facet) => (
              <li key={facet.category}>
                <FilterRow
                  label={facet.category}
                  count={facet.count}
                  active={selectedCategory === facet.category}
                  onClick={() =>
                    onCategoryChange(selectedCategory === facet.category ? null : facet.category)
                  }
                />
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-brand-text">Faixa de preço</h2>
          {priceBounds ? (
            <PriceRangeControl
              bounds={priceBounds}
              priceMin={priceMin}
              priceMax={priceMax}
              onApply={onPriceChange}
            />
          ) : (
            <div className="h-16 animate-pulse rounded-md bg-brand-border/40" aria-hidden />
          )}
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-brand-text">Rede</h2>
          <ul className="flex flex-col gap-2">
            {networks.map((facet) => (
              <li key={facet.network}>
                <FilterRow
                  label={NETWORK_LABELS[facet.network]}
                  count={facet.count}
                  active={selectedNetwork === facet.network}
                  onClick={() =>
                    onNetworkChange(selectedNetwork === facet.network ? null : facet.network)
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Separado do painel de filtros de propósito (Products.svg): "NFT em destaque" tem seu
       *  próprio fundo em degradê, não o mesmo bg-brand-card sólido de Coleções/Rede. */}
      <div className="mt-8">
        <FeaturedNftCard />
      </div>
    </aside>
  )
}

/** Barra dupla de preço (design-refs/Desktop/Início.png: "Faixa de preço" com trilha
 *  laranja + "Preço: 0,02 - 12,30 ETH" + botão Aplicar). O arraste só atualiza o rótulo local
 *  — a mudança só vira navegação/consulta real ao clicar "Aplicar", igual ao comportamento
 *  já existente com os inputs numéricos que este componente substitui. */
function PriceRangeControl({
  bounds,
  priceMin,
  priceMax,
  onApply,
}: {
  bounds: PriceBounds
  priceMin: number | null
  priceMax: number | null
  onApply: (min: number | null, max: number | null) => void
}) {
  const [range, setRange] = useState<[number, number]>([
    priceMin ?? bounds.min,
    priceMax ?? bounds.max,
  ])

  // Se o usuário limpar o filtro em outro lugar (ex.: "Limpar filtros"), o slider acompanha.
  useEffect(() => {
    setRange([priceMin ?? bounds.min, priceMax ?? bounds.max])
  }, [priceMin, priceMax, bounds.min, bounds.max])

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        onApply(range[0], range[1])
      }}
    >
      <Slider
        min={bounds.min}
        max={bounds.max}
        step={0.01}
        value={range}
        onValueChange={(value) => setRange([value[0], value[1]] as [number, number])}
        aria-label="Faixa de preço em ETH"
      />
      <p className="text-sm text-brand-text">
        Preço: {range[0].toFixed(2)} – {range[1].toFixed(2)} ETH
      </p>
      <Button
        type="submit"
        className="h-9 w-fit rounded-md bg-brand-accent-alt px-4 text-brand-bg hover:bg-brand-accent"
      >
        Aplicar
      </Button>
    </form>
  )
}

function FilterRow({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count?: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex w-full items-center justify-between text-left text-sm transition-colors',
        active ? 'font-bold text-brand-accent-alt' : 'text-brand-gold hover:text-brand-accent-alt',
      )}
    >
      <span>{label}</span>
      {count != null && <span>({count})</span>}
    </button>
  )
}
