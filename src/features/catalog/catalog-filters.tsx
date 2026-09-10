// Barra lateral de filtros (design-refs/Desktop/Início.png): coleções (categoria), faixa de
// preço e rede. Filtros são combináveis — vários podem estar ativos ao mesmo tempo — e cada
// mudança aqui reinicia a paginação para a página 1 (feito pelo componente pai, que possui o
// estado da URL; este componente só emite a intenção de mudança).
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CategoryFacet, NetworkFacet, NftNetwork } from '@/types/nft'

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
  onCategoryChange,
  onNetworkChange,
  onPriceChange,
}: CatalogFiltersProps) {
  return (
    <aside className="w-full shrink-0 lg:w-[220px]" aria-label="Filtros do catálogo">
      <section>
        <h2 className="mb-3 text-lg font-bold text-brand-text">Coleções</h2>
        <ul className="flex flex-col gap-2">
          <li>
            <FilterRow
              label="Todas"
              active={selectedCategory === null}
              onClick={() => onCategoryChange(null)}
            />
          </li>
          {categories.map((facet) => (
            <li key={facet.category}>
              <FilterRow
                label={facet.category}
                count={facet.count}
                active={selectedCategory === facet.category}
                onClick={() => onCategoryChange(facet.category)}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-brand-text">Faixa de preço</h2>
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            const min = form.get('priceMin')
            const max = form.get('priceMax')
            onPriceChange(min ? Number(min) : null, max ? Number(max) : null)
          }}
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              name="priceMin"
              min={0}
              step={0.01}
              defaultValue={priceMin ?? ''}
              placeholder="Mín."
              aria-label="Preço mínimo em ETH"
              className="h-9 w-full rounded-md border border-brand-border bg-transparent px-2 text-sm text-brand-text placeholder:text-brand-muted focus-visible:border-brand-border-focus focus-visible:outline-none"
            />
            <span className="text-brand-muted">–</span>
            <input
              type="number"
              name="priceMax"
              min={0}
              step={0.01}
              defaultValue={priceMax ?? ''}
              placeholder="Máx."
              aria-label="Preço máximo em ETH"
              className="h-9 w-full rounded-md border border-brand-border bg-transparent px-2 text-sm text-brand-text placeholder:text-brand-muted focus-visible:border-brand-border-focus focus-visible:outline-none"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            className="mt-1 bg-brand-accent-alt text-brand-card hover:bg-brand-accent"
          >
            Aplicar
          </Button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-brand-text">Rede</h2>
        <ul className="flex flex-col gap-2">
          <li>
            <FilterRow
              label="Todas"
              active={selectedNetwork === null}
              onClick={() => onNetworkChange(null)}
            />
          </li>
          {networks.map((facet) => (
            <li key={facet.network}>
              <FilterRow
                label={NETWORK_LABELS[facet.network]}
                count={facet.count}
                active={selectedNetwork === facet.network}
                onClick={() => onNetworkChange(facet.network)}
              />
            </li>
          ))}
        </ul>
      </section>
    </aside>
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
        active ? 'font-bold text-brand-accent-alt' : 'text-brand-text hover:text-brand-accent-alt',
      )}
    >
      <span>{label}</span>
      {count != null && <span>({count})</span>}
    </button>
  )
}
