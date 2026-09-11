// Tela inicial / catálogo (design-refs/Desktop/Início.png e Mobile/Início.png). Busca,
// filtros, ordenação e paginação compõem o estado da URL (item 3 do desafio) — nada disso
// vive em useState: dar refresh, navegar pelo histórico do navegador ou compartilhar o link
// reproduz exatamente a mesma consulta. Mudar qualquer filtro reinicia a página para 1.
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronRight, Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { OPEN_CATALOG_FILTERS_EVENT } from '@/components/mobile-tab-bar'
import { CatalogFilters } from '@/features/catalog/catalog-filters'
import { NftCard } from '@/features/catalog/nft-card'
import { NftGridSkeleton } from '@/features/catalog/nft-grid-skeleton'
import { useNftFacets, useNftList } from '@/features/catalog/use-catalog'
import { useFavorites } from '@/features/catalog/use-favorites'
import { PromoBanner } from '@/features/home/promo-banner'
import { BlogSection } from '@/features/blog/blog-section'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
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
  type Nft,
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
    favorites: search.favorites === true || search.favorites === 'true',
  }),
  component: HomePage,
})

function HomePage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  // Tab "Favoritos" da barra inferior mobile: sem endpoint dedicado de "catálogo filtrado por
  // favorito", então busca uma página grande do catálogo real (mesmos filtros de busca/
  // categoria/rede/preço/ordenação da URL) e filtra pelos IDs favoritados do usuário — a
  // paginação, nesse modo, passa a ser sobre a lista já filtrada, no cliente.
  const { data: favoriteIds } = useFavorites()
  const params: NftListParams = {
    search: search.q,
    category: search.category,
    network: search.network,
    priceMin: search.priceMin,
    priceMax: search.priceMax,
    sort: search.sort,
    page: search.favorites ? 1 : search.page,
    pageSize: search.favorites ? 200 : PAGE_SIZE,
  }
  const { data: rawData, isLoading, isError, isPlaceholderData } = useNftList(params)

  const data = search.favorites
    ? filterAndPaginate(rawData, favoriteIds ?? [], search.page, PAGE_SIZE)
    : rawData

  // Slides do herói (design-refs/Mobile/Hero Banner.png): os 3 NFTs mais bem avaliados do
  // catálogo real, independente dos filtros aplicados na grade abaixo — não é uma vitrine
  // decorativa fixa, cada slide leva ao detalhe real daquele NFT.
  const { data: heroData } = useNftList({
    search: '',
    category: null,
    network: null,
    priceMin: null,
    priceMax: null,
    sort: 'rating',
    page: 1,
    pageSize: 3,
  })

  const { data: facets } = useNftFacets()
  const [quickTab, setQuickTab] = useState<QuickTab>('all')
  const [filtersOpen, setFiltersOpen] = useState(false)

  // O botão flutuante central da barra inferior mobile (mobile-tab-bar.tsx) pede pra abrir
  // esta mesma folha de filtros, de fora da árvore desta página.
  useEffect(() => {
    function openFilters() {
      setFiltersOpen(true)
    }
    window.addEventListener(OPEN_CATALOG_FILTERS_EVENT, openFilters)
    return () => window.removeEventListener(OPEN_CATALOG_FILTERS_EVENT, openFilters)
  }, [])

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

  const filterProps = {
    categories: facets?.categories ?? [],
    networks: facets?.networks ?? [],
    selectedCategory: search.category,
    selectedNetwork: search.network,
    priceMin: search.priceMin,
    priceMax: search.priceMax,
    priceBounds: facets?.priceBounds,
    onCategoryChange: (category: string | null) => updateSearch({ category }),
    onNetworkChange: (network: NftNetwork | null) => updateSearch({ network }),
    onPriceChange: (priceMin: number | null, priceMax: number | null) => updateSearch({ priceMin, priceMax }),
  }

  return (
    <main>
      {/* Busca + botão de filtros (design-refs/Mobile/Início.png): substitui, no mobile, a
       *  faixa "Bem-vindo à Kurio" + herói por uma barra de busca fixa no topo do conteúdo.
       *  O painel de filtros da barra lateral (Coleções/Faixa de preço/Rede) passa a abrir
       *  numa folha (Sheet) por trás do botão, em vez de ficar sempre visível empilhado. */}
      <div className="flex items-center gap-3 px-5 pt-4 lg:hidden">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const value = new FormData(event.currentTarget).get('q')
            updateSearch({ q: typeof value === 'string' ? value : '' })
          }}
          className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl bg-brand-card px-4"
        >
          <Search size={18} className="shrink-0 text-brand-muted" />
          <input
            name="q"
            type="search"
            defaultValue={search.q}
            placeholder="Explorar coleções"
            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-brand-text placeholder:font-bold placeholder:text-brand-text focus-visible:outline-none"
          />
        </form>

        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Abrir filtros do catálogo"
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-accent-alt text-brand-bg"
            >
              <SlidersHorizontal size={18} />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="border-brand-border bg-brand-bg text-brand-text">
            <div className="mt-10 px-4">
              <CatalogFilters {...filterProps} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <HeroSection nfts={heroData?.items ?? []} onExplore={() => updateSearch({})} />

      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 py-10 lg:flex-row lg:gap-6 lg:px-[120px]">
        <div className="hidden lg:block">
          <CatalogFilters {...filterProps} />
        </div>

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
            isFavoritesView={search.favorites}
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
    </main>
  )
}

/** Herói com carrossel real (design-refs/Mobile/Início.png + Hero Banner.png): cada slide é
 *  um dos NFTs mais bem avaliados do catálogo (ver HomePage), com "Explorar" levando direto
 *  ao detalhe daquele item — não uma vitrine decorativa. No toque (mobile), arrasta para o
 *  lado troca de slide; no mouse (desktop) só as bolinhas trocam — não há arraste — porque o
 *  gesto só é escutado quando `pointerType === 'touch'` (ver handlePointerDown), que é
 *  exatamente a assimetria mostrada no Hero Banner.png (a animação de arraste é uma interação
 *  de toque, o desktop só mostra os indicadores). Sem timer de autoavanço: um carrossel que
 *  gira por conta própria é a fonte clássica de flakiness em teste E2E, e aqui a troca de
 *  slide já é uma ação real do usuário (arrastar ou clicar na bolinha).
 */
function HeroSection({ nfts, onExplore }: { nfts: Nft[]; onExplore: () => void }) {
  const [active, setActive] = useState(0)
  const dragRef = useRef<{ startX: number; deltaX: number } | null>(null)

  const slideCount = nfts.length > 0 ? nfts.length : 1
  const clampedActive = Math.min(active, slideCount - 1)

  function handlePointerDown(event: React.PointerEvent) {
    if (event.pointerType !== 'touch') return
    dragRef.current = { startX: event.clientX, deltaX: 0 }
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (!dragRef.current) return
    dragRef.current.deltaX = event.clientX - dragRef.current.startX
  }

  function handlePointerUp() {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag) return
    const THRESHOLD = 40
    if (drag.deltaX <= -THRESHOLD) setActive((current) => Math.min(current + 1, slideCount - 1))
    else if (drag.deltaX >= THRESHOLD) setActive((current) => Math.max(current - 1, 0))
  }

  return (
    <section className="overflow-hidden">
      {/* Larguras explícitas (não flex-basis implícito): cada slide tem exatamente
       *  100/slideCount% de uma trilha que mede slideCount*100% — evita a ambiguidade de
       *  "width: 100%" num item flex cujo próprio container não tem largura definida (o
       *  slide seguinte "sangrava" pra dentro da tela no desktop antes desta correção). */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="flex touch-pan-y transition-transform duration-300 ease-out"
        style={{ width: `${slideCount * 100}%`, transform: `translateX(-${clampedActive * (100 / slideCount)}%)` }}
      >
        {(nfts.length > 0 ? nfts : [null]).map((nft, index) => (
          <HeroSlideContent
            key={nft?.id ?? 'placeholder'}
            nft={nft}
            nextNft={nfts[index + 1] ?? nfts[0]}
            onExplore={onExplore}
            widthPercent={100 / slideCount}
          />
        ))}
      </div>

      {slideCount > 1 && (
        <div className="flex justify-center gap-2 pb-6 lg:justify-start lg:px-[120px]" role="tablist" aria-label="Slides do herói">
          {nfts.map((nft, index) => (
            <button
              key={nft.id}
              type="button"
              role="tab"
              aria-selected={index === clampedActive}
              aria-label={`Ver destaque ${nft.name}`}
              onClick={() => setActive(index)}
              className={cn(
                'size-2 rounded-full transition-colors',
                index === clampedActive ? 'bg-brand-accent-alt' : 'bg-brand-accent-alt/30',
              )}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function HeroSlideContent({
  nft,
  nextNft,
  onExplore,
  widthPercent,
}: {
  nft: Nft | null
  nextNft?: Nft
  onExplore: () => void
  widthPercent: number
}) {
  return (
    <div
      style={{ width: `${widthPercent}%` }}
      className="mx-auto flex shrink-0 flex-col gap-8 px-5 py-10 lg:max-w-[1200px] lg:flex-row lg:items-center lg:px-[120px]"
    >
      <div className="flex-1">
        <p className="text-sm text-brand-text">Bem-vindo à Kurio</p>
        <h1 className="mt-3 max-w-xl text-[32px] leading-tight font-bold text-brand-text lg:text-[43px] lg:leading-[70px]">
          SEJA DONO DA CULTURA DIGITAL
        </h1>
        <p className="mt-3 max-w-md text-sm text-brand-muted">
          {nft
            ? `${nft.name} · ${nft.priceEth} ETH — descubra NFTs selecionados de criadores do mundo todo.`
            : 'Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.'}
        </p>
        {nft ? (
          <Link
            to="/nft/$nftId"
            params={{ nftId: nft.id }}
            className="mt-6 inline-flex h-10 items-center gap-1.5 rounded-md bg-brand-accent-alt px-8 font-bold text-brand-bg uppercase tracking-wide hover:bg-brand-accent"
          >
            Explorar
          </Link>
        ) : (
          <Button
            onClick={onExplore}
            className="mt-6 h-10 rounded-md bg-brand-accent-alt px-8 font-bold text-brand-bg uppercase tracking-wide hover:bg-brand-accent"
          >
            Explorar
          </Button>
        )}
      </div>

      <div className="relative flex flex-1 items-center justify-center lg:justify-end">
        <img
          src={nft?.imageUrl ?? heroImage}
          alt={nft ? `NFT em destaque: ${nft.name}` : 'Ilustração de um dos NFTs em destaque da coleção Kurio'}
          className="w-full max-w-sm rounded-2xl object-cover"
          loading="eager"
          draggable={false}
        />
        {nextNft && (
          <img
            src={nextNft.imageUrl}
            alt=""
            aria-hidden
            draggable={false}
            className="absolute bottom-0 left-1/2 size-20 -translate-x-[calc(50%+7rem)] rounded-xl border-4 border-brand-bg object-cover shadow-lg sm:size-24"
          />
        )}
      </div>
    </div>
  )
}

/** Aplica o filtro de favoritos sobre uma página já buscada do catálogo e refaz a paginação
 *  no cliente — usado só pela tab "Favoritos" da barra inferior mobile (ver HomePage acima).
 *  Mantém o mesmo formato de retorno de `useNftList` para que o resto da tela (grade,
 *  paginação, estado vazio) não precise saber que essa página é diferente. */
function filterAndPaginate(
  raw: { items: Nft[]; total: number } | undefined,
  favoriteIds: string[],
  page: number,
  pageSize: number,
) {
  if (!raw) return raw
  const filtered = raw.items.filter((item) => favoriteIds.includes(item.id))
  const start = (page - 1) * pageSize
  return {
    items: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    pageSize,
  }
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
  isFavoritesView,
  items,
}: {
  isLoading: boolean
  isError: boolean
  isEmpty: boolean
  isFavoritesView: boolean
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
        <p className="text-brand-text">
          {isFavoritesView ? 'Você ainda não favoritou nenhum NFT.' : 'Nenhum NFT encontrado com esses filtros.'}
        </p>
        <p className="mt-1 text-sm text-brand-muted">
          {isFavoritesView
            ? 'Toque no coração dentro do detalhe de um NFT para vê-lo aqui.'
            : 'Tente ajustar a busca, a categoria ou a faixa de preço.'}
        </p>
      </div>
    )
  }

  // 2 colunas já no mobile (design-refs/Mobile/Início.png) — só o desktop ganha a 3ª coluna.
  return (
    <div data-testid="nft-grid" className="grid grid-cols-2 gap-4 sm:gap-7 xl:grid-cols-3">
      {items.map((nft) => (
        <NftCard key={nft.id} nft={nft} />
      ))}
    </div>
  )
}
