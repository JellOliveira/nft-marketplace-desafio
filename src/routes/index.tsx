// Tela inicial / catálogo (design-refs/Desktop/Início.png e Mobile/Início.png). Busca,
// filtros, ordenação e paginação compõem o estado da URL (item 3 do desafio) — nada disso
// vive em useState: dar refresh, navegar pelo histórico do navegador ou compartilhar o link
// reproduz exatamente a mesma consulta. Mudar qualquer filtro reinicia a página para 1.
import { createFileRoute } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, SearchIcon } from 'lucide-react'
import { CatalogFilters } from '@/features/catalog/catalog-filters'
import { NftCard } from '@/features/catalog/nft-card'
import { NftGridSkeleton } from '@/features/catalog/nft-grid-skeleton'
import { useNftFacets, useNftList } from '@/features/catalog/use-catalog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DEFAULT_CATALOG_SEARCH,
  type CatalogSearch,
  type NftListParams,
  type NftNetwork,
  type NftSortOption,
} from '@/types/nft'

const PAGE_SIZE = 9

const SORT_LABELS: Record<NftSortOption, string> = {
  recent: 'Listados recentemente',
  'price-asc': 'Menor preço',
  'price-desc': 'Maior preço',
  rating: 'Mais bem avaliados',
}

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): CatalogSearch => ({
    q: typeof search.q === 'string' ? search.q : DEFAULT_CATALOG_SEARCH.q,
    category: typeof search.category === 'string' ? search.category : DEFAULT_CATALOG_SEARCH.category,
    network: typeof search.network === 'string' ? (search.network as NftNetwork) : DEFAULT_CATALOG_SEARCH.network,
    priceMin: typeof search.priceMin === 'number' ? search.priceMin : DEFAULT_CATALOG_SEARCH.priceMin,
    priceMax: typeof search.priceMax === 'number' ? search.priceMax : DEFAULT_CATALOG_SEARCH.priceMax,
    sort: typeof search.sort === 'string' ? (search.sort as NftSortOption) : DEFAULT_CATALOG_SEARCH.sort,
    page: typeof search.page === 'number' && search.page > 0 ? search.page : DEFAULT_CATALOG_SEARCH.page,
  }),
  component: HomePage,
})

function HomePage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const params: NftListParams = {
    search: search.q,
    category: search.category,
    network: search.network,
    priceMin: search.priceMin,
    priceMax: search.priceMax,
    sort: search.sort,
    page: search.page,
    pageSize: PAGE_SIZE,
  }
  const { data, isLoading, isError, isPlaceholderData } = useNftList(params)
  const { data: facets } = useNftFacets()

  /** Atualiza um ou mais campos da URL. Qualquer mudança que não seja só de página reinicia
   *  a paginação para 1 — exigido pelo item 3 do desafio ("mudança de filtro deve reiniciar
   *  a paginação"). */
  function updateSearch(patch: Partial<CatalogSearch>, resetPage = true) {
    navigate({
      search: (previous) => ({
        ...previous,
        ...patch,
        page: resetPage ? 1 : (patch.page ?? previous.page),
      }),
    })
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return (
    <main>
      <HeroSection onExplore={() => updateSearch({})} />

      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 py-10 lg:flex-row lg:px-[120px]">
        <CatalogFilters
          categories={facets?.categories ?? []}
          networks={facets?.networks ?? []}
          selectedCategory={search.category}
          selectedNetwork={search.network}
          priceMin={search.priceMin}
          priceMax={search.priceMax}
          onCategoryChange={(category) => updateSearch({ category })}
          onNetworkChange={(network) => updateSearch({ network })}
          onPriceChange={(priceMin, priceMax) => updateSearch({ priceMin, priceMax })}
        />

        <section className="min-w-0 flex-1">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative flex-1 sm:max-w-xs">
              <span className="sr-only">Buscar NFTs por nome, artista ou coleção</span>
              <SearchIcon
                size={16}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-brand-muted"
              />
              <input
                type="search"
                defaultValue={search.q}
                placeholder="Buscar NFTs, artistas, coleções…"
                onChange={(event) => updateSearch({ q: event.currentTarget.value })}
                className="h-10 w-full rounded-md border border-brand-border bg-transparent py-2 pr-3 pl-9 text-sm text-brand-text placeholder:text-brand-muted focus-visible:border-brand-border-focus focus-visible:outline-none"
              />
            </label>

            <div className="flex items-center gap-2 text-sm text-brand-text">
              <span className="whitespace-nowrap text-brand-muted">Ordenar por:</span>
              <Select
                value={search.sort}
                onValueChange={(value) => updateSearch({ sort: value as NftSortOption })}
              >
                <SelectTrigger
                  size="sm"
                  className="border-brand-border bg-transparent text-brand-text"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-brand-border bg-brand-card text-brand-text">
                  {Object.entries(SORT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <CatalogResults
            isLoading={isLoading}
            isError={isError}
            isEmpty={Boolean(data && data.items.length === 0)}
            items={data?.items ?? []}
          />

          {data && data.total > 0 && (
            <nav
              className="mt-8 flex items-center justify-center gap-2"
              aria-label="Paginação do catálogo"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={search.page <= 1}
                onClick={() => updateSearch({ page: search.page - 1 }, false)}
                aria-label="Página anterior"
              >
                <ChevronLeft />
              </Button>
              <span className="text-sm text-brand-muted">
                Página {search.page} de {totalPages}
                {isPlaceholderData && '…'}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={search.page >= totalPages}
                onClick={() => updateSearch({ page: search.page + 1 }, false)}
                aria-label="Próxima página"
              >
                <ChevronRight />
              </Button>
            </nav>
          )}
        </section>
      </div>
    </main>
  )
}

function HeroSection({ onExplore }: { onExplore: () => void }) {
  return (
    <section className="mx-auto max-w-[1200px] px-5 py-10 lg:px-[120px]">
      <p className="text-sm text-brand-muted">Bem-vindo à Kurio</p>
      <h1 className="mt-3 max-w-xl text-[32px] leading-tight font-bold text-brand-text lg:text-[43px] lg:leading-[70px]">
        SEJA DONO DO FUTURO DA ARTE DIGITAL
      </h1>
      <p className="mt-3 max-w-md text-sm text-brand-muted">
        Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte
        digital rara, apoie artistas e tenha uma parte da cultura da internet.
      </p>
      <Button
        onClick={onExplore}
        className="mt-6 bg-brand-accent-alt text-brand-card hover:bg-brand-accent"
      >
        Explorar
      </Button>
    </section>
  )
}

function CatalogResults({
  isLoading,
  isError,
  isEmpty,
  items,
}: {
  isLoading: boolean
  isError: boolean
  isEmpty: boolean
  items: ReturnType<typeof useNftList>['data'] extends { items: infer Items } | undefined
    ? Items extends unknown[]
      ? Items
      : never
    : never
}) {
  if (isLoading) return <NftGridSkeleton />

  if (isError) {
    return (
      <div role="alert" className="rounded-xl border border-brand-border p-10 text-center">
        <p className="text-brand-text">Não foi possível carregar o catálogo agora.</p>
        <p className="mt-1 text-sm text-brand-muted">
          Verifique sua conexão e tente novamente em instantes.
        </p>
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="rounded-xl border border-brand-border p-10 text-center">
        <p className="text-brand-text">Nenhum NFT encontrado com esses filtros.</p>
        <p className="mt-1 text-sm text-brand-muted">
          Tente ajustar a busca, a categoria ou a faixa de preço.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((nft) => (
        <NftCard key={nft.id} nft={nft} />
      ))}
    </div>
  )
}
