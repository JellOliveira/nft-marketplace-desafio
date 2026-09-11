// Tela inicial / catálogo (design-refs/Desktop/Início.png e Mobile/Início.png). Busca,
// filtros, ordenação e paginação compõem o estado da URL (item 3 do desafio) — nada disso
// vive em useState: dar refresh, navegar pelo histórico do navegador ou compartilhar o link
// reproduz exatamente a mesma consulta. Mudar qualquer filtro reinicia a página para 1.
import { createFileRoute } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CatalogFilters } from '@/features/catalog/catalog-filters'
import { NftCard } from '@/features/catalog/nft-card'
import { NftGridSkeleton } from '@/features/catalog/nft-grid-skeleton'
import { useNftFacets, useNftList } from '@/features/catalog/use-catalog'
import { PromoBanner } from '@/features/home/promo-banner'
import { NewsletterSection } from '@/features/home/newsletter-section'
import { BlogSection } from '@/features/blog/blog-section'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  DEFAULT_CATALOG_SEARCH,
  type CatalogSearch,
  type NftListParams,
  type NftNetwork,
  type NftSortOption,
} from '@/types/nft'
import heroImage from '@/assets/hero/hero.webp'
import banner1Image from '@/assets/promo/banner-1.webp'
import banner2Image from '@/assets/promo/banner-2.webp'

const PAGE_SIZE = 9

const SORT_LABELS: Record<NftSortOption, string> = {
  recent: 'Listados recentemente',
  'price-asc': 'Menor preço',
  'price-desc': 'Maior preço',
  rating: 'Mais bem avaliados',
}

/** As 3 abas rápidas acima da grade (design-refs/Products.svg: "Todos os NFTs | Novos
 *  lançamentos | Em alta"), à esquerda do "Ordenar por". "Novos lançamentos" e "Em alta"
 *  aplicam um `sort` real (recent/rating) — não são decorativas. "Todos os NFTs" também
 *  limpa categoria, rede e busca, então nem sempre dá pra saber pela URL sozinha se o estado
 *  atual veio dele ou de "Novos lançamentos" (os dois usam sort=recent); por isso a aba ativa
 *  é um estado de UI local, não derivado só da URL — mas cada clique continua mudando o
 *  catálogo de verdade, então não é um controle decorativo. */
type QuickTab = 'all' | 'new' | 'trending' | 'custom'

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
  const [quickTab, setQuickTab] = useState<QuickTab>('all')

  // Mantém a aba em sincronia quando o sort muda por outro caminho (o dropdown "Ordenar
  // por", ou o link "Explorar" do herói) — não cobre o caso "Todos" vs. "Novos lançamentos"
  // (ambos usam sort=recent), então só reage quando dá pra saber com certeza.
  useEffect(() => {
    if (search.sort === 'rating') setQuickTab('trending')
    else if (search.sort !== 'recent') setQuickTab('custom')
    else setQuickTab((previous) => (previous === 'new' ? previous : 'all'))
  }, [search.sort])

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

      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 py-10 lg:flex-row lg:gap-6 lg:px-[120px]">
        <CatalogFilters
          categories={facets?.categories ?? []}
          networks={facets?.networks ?? []}
          selectedCategory={search.category}
          selectedNetwork={search.network}
          priceMin={search.priceMin}
          priceMax={search.priceMax}
          priceBounds={facets?.priceBounds}
          onCategoryChange={(category) => updateSearch({ category })}
          onNetworkChange={(network) => updateSearch({ network })}
          onPriceChange={(priceMin, priceMax) => updateSearch({ priceMin, priceMax })}
        />

        <section className="min-w-0 flex-1">
          <div className="mb-6 flex flex-col flex-wrap gap-x-4 gap-y-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4" role="tablist" aria-label="Filtro rápido do catálogo">
              <QuickTabButton
                active={quickTab === 'all'}
                onClick={() => {
                  setQuickTab('all')
                  updateSearch({ q: '', category: null, network: null, priceMin: null, priceMax: null, sort: 'recent' })
                }}
              >
                Todos os NFTs
              </QuickTabButton>
              <QuickTabButton
                active={quickTab === 'new'}
                onClick={() => {
                  setQuickTab('new')
                  updateSearch({ sort: 'recent' })
                }}
              >
                Novos lançamentos
              </QuickTabButton>
              <QuickTabButton
                active={quickTab === 'trending'}
                onClick={() => {
                  setQuickTab('trending')
                  updateSearch({ sort: 'rating' })
                }}
              >
                Em alta
              </QuickTabButton>
            </div>

            <div className="flex items-center gap-2 text-sm text-brand-text">
              <span className="hidden whitespace-nowrap text-brand-text xl:inline">Ordenar por:</span>
              <Select
                value={search.sort}
                onValueChange={(value) => updateSearch({ sort: value as NftSortOption })}
              >
                <SelectTrigger
                  size="sm"
                  className="w-[150px] border-brand-border bg-transparent text-brand-text lg:w-[130px] xl:w-[170px]"
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
              className="mt-8 flex items-center justify-end gap-2"
              aria-label="Paginação do catálogo"
            >
              {getPageWindow(search.page, totalPages).map((page) => (
                <button
                  key={page}
                  type="button"
                  aria-current={page === search.page ? 'page' : undefined}
                  aria-label={`Página ${page}`}
                  onClick={() => updateSearch({ page }, false)}
                  className={cn(
                    'flex size-9 items-center justify-center rounded-md text-sm font-bold transition-colors',
                    page === search.page
                      ? 'bg-brand-accent-alt text-brand-bg'
                      : 'border border-brand-border text-brand-text hover:border-brand-accent-alt',
                  )}
                >
                  {page}
                </button>
              ))}
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 rounded-md border-brand-border text-brand-text"
                disabled={search.page >= totalPages}
                onClick={() => updateSearch({ page: search.page + 1 }, false)}
                aria-label="Próxima página"
              >
                <ChevronRight size={16} />
              </Button>
              {isPlaceholderData && <span className="sr-only">Carregando…</span>}
            </nav>
          )}
        </section>
      </div>

      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 pb-14 sm:flex-row lg:px-[120px]">
        <PromoBanner
          image={banner1Image}
          title="Lançamentos gênese de edição limitada"
          description="Colecione edições escassas diretamente dos criadores antes da revelação pública."
        />
        <PromoBanner
          image={banner2Image}
          title="Arte digital selecionada e muito mais"
          description="Explore novos artistas, coleções verificadas e obras digitais que definem a cultura."
          category="Arte digital"
        />
      </div>

      <BlogSection />
      <NewsletterSection />
    </main>
  )
}

function HeroSection({ onExplore }: { onExplore: () => void }) {
  return (
    <section className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 py-10 lg:flex-row lg:items-center lg:px-[120px]">
      <div className="flex-1">
        <p className="text-sm text-brand-text">Bem-vindo à Kurio</p>
        <h1 className="mt-3 max-w-xl text-[32px] leading-tight font-bold text-brand-text lg:text-[43px] lg:leading-[70px]">
          SEJA DONO DO FUTURO DA ARTE DIGITAL
        </h1>
        <p className="mt-3 max-w-md text-sm text-brand-muted">
          Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte
          digital rara, apoie artistas e tenha uma parte da cultura da internet.
        </p>
        <Button
          onClick={onExplore}
          className="mt-6 h-10 rounded-md bg-brand-accent-alt px-8 font-bold text-brand-bg uppercase tracking-wide hover:bg-brand-accent"
        >
          Explorar
        </Button>
      </div>

      <div className="flex shrink-0 gap-2 self-center lg:self-end" aria-hidden>
        <span className="size-2 rounded-full bg-brand-accent-alt" />
        <span className="size-2 rounded-full bg-brand-accent-alt" />
        <span className="size-2 rounded-full bg-brand-accent-alt" />
      </div>

      <div className="flex flex-1 items-center justify-center lg:justify-end">
        <img
          src={heroImage}
          alt="Ilustração de um dos NFTs em destaque da coleção Kurio"
          className="w-full max-w-sm rounded-2xl object-cover"
          loading="eager"
        />
      </div>
    </section>
  )
}

/** Janela de páginas exibidas nos quadrados de paginação (design-refs/Products.svg: quadrados
 *  numerados + seta, sem "Página X de Y") — no máximo `size` números, centralizados na página
 *  atual quando possível. */
function getPageWindow(current: number, total: number, size = 4): number[] {
  if (total <= size) return Array.from({ length: total }, (_, i) => i + 1)
  let start = Math.max(1, current - Math.floor(size / 2))
  const end = Math.min(total, start + size - 1)
  start = Math.max(1, end - size + 1)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

function QuickTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'border-b-2 pb-1 text-sm whitespace-nowrap transition-colors',
        active
          ? 'border-brand-accent-alt font-bold text-brand-accent-alt'
          : 'border-transparent text-brand-text hover:text-brand-accent-alt',
      )}
    >
      {children}
    </button>
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
    <div data-testid="nft-grid" className="grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((nft) => (
        <NftCard key={nft.id} nft={nft} />
      ))}
    </div>
  )
}
