// Carrinho de NFTs (design-refs/Código do Carrinho do NFT.html + Carrinho de NFTs.png): lista
// de itens com edição de quantidade e remoção, cupom promocional e resumo de valores. Os
// totais exibidos são sempre os que a API retornou — nunca calculados no cliente — para que
// um evento de tempo real que mude preço/disponibilidade durante a navegação seja refletido
// aqui sem divergência (item 3 do desafio).
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Minus, Plus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { NftCard } from '@/features/catalog/nft-card'
import { useNftList } from '@/features/catalog/use-catalog'
import { CartTotals, CouponBox } from '@/features/cart/cart-summary'
import { useCart, useRemoveCartItem, useUpdateCartItem } from '@/features/cart/use-cart'
import { cn } from '@/lib/utils'
import { DEFAULT_CATALOG_SEARCH } from '@/types/nft'

export const Route = createFileRoute('/carrinho')({
  component: CartPage,
})

function CartPage() {
  const { data: cart, isLoading } = useCart()
  const navigate = useNavigate()

  return (
    <main className="mx-auto max-w-[1200px] px-5 py-10 lg:px-6 xl:px-10">
      {/* Barra mobile (design-refs/Mobile/Carrinho de NFTs.png): seta "voltar" + título
       *  centralizado — o header padrão fica escondido nesta tela abaixo de lg. */}
      <div className="relative mb-6 flex items-center justify-center lg:hidden">
        <button
          type="button"
          onClick={() => navigate({ to: '/', search: DEFAULT_CATALOG_SEARCH })}
          aria-label="Voltar ao catálogo"
          className="absolute left-0 flex size-9 items-center justify-center rounded-full bg-brand-card text-brand-text"
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-lg font-bold text-brand-text">Carrinho de NFTs</h1>
      </div>

      {/* Início / Mercado / Carrinho (desktop) */}
      <nav aria-label="Trilha de navegação" className="mb-3 hidden text-sm text-brand-text lg:block">
        <Link to="/" search={DEFAULT_CATALOG_SEARCH} className="hover:text-brand-text">
          Início
        </Link>
        <span className="mx-2">/</span>
        <span>Mercado</span>
        <span className="mx-2">/</span>
        <span>Carrinho</span>
      </nav>

      <h1 className="mb-6 hidden text-lg font-bold text-brand-text lg:block">NFTs</h1>

      {isLoading && <CartSkeleton />}

      {cart && cart.lines.length === 0 && (
        <div className="rounded-xl border border-brand-border p-10 text-center">
          <p className="text-brand-text">Seu carrinho está vazio.</p>
          <Link to="/" search={DEFAULT_CATALOG_SEARCH} className="mt-3 inline-block text-sm text-brand-accent">
            Continuar explorando
          </Link>
        </div>
      )}

      {cart && cart.lines.length > 0 && (
        <div className="flex flex-col gap-8 lg:flex-row">
          <section className="min-w-0 flex-1">
            {/* Cabeçalho das colunas (design-refs/Código do Carrinho do NFT.html) — some no
             *  mobile, onde cada linha já rotula os próprios valores. */}
            <div className="mb-3 hidden items-center gap-4 px-4 text-sm font-bold text-brand-text sm:flex">
              <span className="w-16" aria-hidden="true" />
              <span className="min-w-0 flex-1">NFTs</span>
              <span className="w-20 text-center font-medium">Preço</span>
              <span className="w-24 text-center">Edições</span>
              <span className="w-20 text-right font-medium">Total</span>
              <span className="w-6" aria-hidden="true" />
            </div>
            <div className="mb-3 h-px bg-brand-accent-alt/30" aria-hidden="true" />

            <div className="flex flex-col gap-3">
              {cart.lines.map((line) => (
                <CartLineRow key={`${line.nftId}-${line.edition}`} line={line} />
              ))}
            </div>
          </section>

          <CartSummaryPanel
            subtotal={cart.subtotalEth}
            discount={cart.discountEth}
            networkFee={cart.networkFeeEth}
            total={cart.totalEth}
            couponCode={cart.coupon?.code ?? null}
          />
        </div>
      )}

      {cart && cart.lines.length > 0 && <RecommendedSection excludeIds={cart.lines.map((line) => line.nftId)} />}
    </main>
  )
}

function CartSkeleton() {
  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <div className="flex-1 space-y-3">
        {[1, 2, 3].map((key) => (
          <Skeleton key={key} className="h-20 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-xl lg:w-[340px]" />
    </div>
  )
}

/** Cada item tem seu próprio fundo (design-refs: "não tem fundo completo, ele fica em volta
 *  de cada produto adicionado #241612") — não é uma lista dentro de um card único. */
function CartLineRow({ line }: { line: NonNullable<ReturnType<typeof useCart>['data']>['lines'][number] }) {
  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveCartItem()
  const lineTotal = (Number(line.priceEth) * line.quantity).toFixed(2)
  const atMax = line.quantity >= line.availableQuantity

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-brand-card p-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
      <div className="flex items-center gap-4">
        <img
          src={line.imageUrl}
          alt=""
          className="size-16 shrink-0 rounded-md object-cover"
          width={64}
          height={64}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-brand-text">{line.name}</p>
          <p className="text-sm text-brand-muted">ID do token: {line.tokenId}</p>
          {/* Preço unitário: só no mobile, ao lado do nome — no desktop já tem sua própria
              coluna, então repetir aqui seria redundante. */}
          <p className="text-xs text-brand-muted sm:hidden">{line.priceEth} ETH cada</p>
        </div>
        {/* Lixeira ao lado do nome no mobile (a linha de baixo é só preço/quantidade/total). */}
        <button
          type="button"
          aria-label={`Remover ${line.name} do carrinho`}
          disabled={removeItem.isPending}
          onClick={() => removeItem.mutate({ nftId: line.nftId, edition: line.edition })}
          className="ml-auto text-brand-muted hover:text-brand-error sm:hidden"
        >
          <Trash2 size={20} />
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 sm:contents">
        <p className="hidden w-20 text-center font-bold text-brand-accent sm:block">{line.priceEth} ETH</p>

        <div className="flex w-24 items-center justify-center gap-2">
          <button
            type="button"
            aria-label="Diminuir quantidade"
            disabled={updateItem.isPending}
            onClick={() =>
              updateItem.mutate({ nftId: line.nftId, edition: line.edition, quantity: line.quantity - 1 })
            }
            className="flex size-7 items-center justify-center rounded-full bg-brand-accent text-brand-bg disabled:opacity-50"
          >
            <Minus size={14} />
          </button>
          {/* w-6 (não w-4): a suíte e2e localiza a quantidade por "span.w-6.text-center". */}
          <span className="w-6 text-center text-brand-text">{line.quantity}</span>
          <button
            type="button"
            aria-label="Aumentar quantidade"
            disabled={updateItem.isPending || atMax}
            title={atMax ? 'Quantidade máxima disponível' : undefined}
            onClick={() =>
              updateItem.mutate({ nftId: line.nftId, edition: line.edition, quantity: line.quantity + 1 })
            }
            className="flex size-7 items-center justify-center rounded-full bg-brand-accent text-brand-bg disabled:opacity-50"
          >
            <Plus size={14} />
          </button>
        </div>

        <p data-testid="cart-line-total" className="w-20 text-right font-bold text-brand-accent">
          {lineTotal} ETH
        </p>

        <button
          type="button"
          aria-label={`Remover ${line.name} do carrinho`}
          disabled={removeItem.isPending}
          onClick={() => removeItem.mutate({ nftId: line.nftId, edition: line.edition })}
          className="hidden text-brand-muted hover:text-brand-error sm:block"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  )
}

function CartSummaryPanel({
  subtotal,
  discount,
  networkFee,
  total,
  couponCode,
}: {
  subtotal: string
  discount: string
  networkFee: string
  total: string
  couponCode: string | null
}) {
  return (
    <aside className="w-full shrink-0 lg:w-[340px]">
      {/* Desktop (design-refs/Desktop/Carrinho de NFTs.png): cupom, totais (com o Total já
       *  dentro) e botão soltos no fundo da página, sem barra fixa. */}
      <div className="hidden lg:block">
        <h2 className="text-lg font-bold text-brand-text">Resumo da carteira</h2>
        <div className="mt-3 mb-4 h-px bg-brand-accent-alt/30" aria-hidden="true" />
        <CouponBox couponCode={couponCode} variant="inline" />
        <CartTotals
          subtotal={subtotal}
          discount={discount}
          networkFee={networkFee}
          total={total}
          estimatedFeeAlign="right"
        />
        <Button asChild className="mt-6 w-full rounded-full bg-brand-accent text-brand-bg hover:bg-brand-accent-alt">
          <Link to="/pagamento">Conectar e finalizar</Link>
        </Button>
        <Link to="/" search={DEFAULT_CATALOG_SEARCH} className="mt-3 block text-center text-sm text-brand-accent">
          Continuar explorando
        </Link>
      </div>

      {/* Mobile: cupom + quebra de valores (sem o Total, que vira a MobileCartBar fixa no
       *  rodapé — design-refs/Mobile/Buy Bar.svg) dentro da "sheet" escura (design-refs/
       *  Mobile/Payment Summary.svg), com "Continuar explorando" ainda solto abaixo dela. */}
      <div className="lg:hidden">
        <div className="rounded-2xl bg-brand-card p-4">
          <CouponBox couponCode={couponCode} variant="inline" />
          <CartTotals subtotal={subtotal} discount={discount} networkFee={networkFee} estimatedFeeAlign="right" hideTotal />
        </div>
        <Link to="/" search={DEFAULT_CATALOG_SEARCH} className="mt-3 block text-center text-sm text-brand-accent">
          Continuar explorando
        </Link>

        {/* Reserva espaço pra MobileCartBar (fixa, position:fixed) não cobrir o fim da página. */}
        <div className="h-24" aria-hidden="true" />
      </div>

      <MobileCartBar total={total} />
    </aside>
  )
}

/** Barra fixa no rodapé do mobile (design-refs/Mobile/Buy Bar.svg): Total + "Conectar e
 *  finalizar" — mesma ideia do MobileBuyBar do detalhe do NFT, aqui sem controle de
 *  quantidade (isso já é por linha, dentro da lista de itens). */
function MobileCartBar({ total }: { total: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-2xl bg-brand-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.35)] lg:hidden">
      <div className="flex items-center justify-between">
        <span className="font-bold text-brand-text">Total</span>
        <span className="text-lg font-bold text-brand-accent">{total ? `${total} ETH` : '—'}</span>
      </div>
      <Button
        asChild
        className="mt-3 w-full rounded-full bg-brand-accent text-brand-bg hover:bg-brand-accent-alt"
      >
        <Link to="/pagamento">Conectar e finalizar</Link>
      </Button>
    </div>
  )
}

/** "Colecionadores também viram" (design-refs/Carrinho de NFTs.png): outros NFTs que ainda
 *  não estão no carrinho, paginados de 5 em 5 com scroll-snap real e 3 bolinhas — mesmo
 *  padrão do carrossel "Mais desta coleção" da página de detalhe do NFT. Sem endpoint
 *  dedicado de recomendação — reaproveita a listagem real do catálogo. */
function RecommendedSection({ excludeIds }: { excludeIds: string[] }) {
  const { data } = useNftList({
    search: '',
    category: null,
    network: null,
    priceMin: null,
    priceMax: null,
    sort: 'recent',
    page: 1,
    pageSize: 20,
  })
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activePage, setActivePage] = useState(0)

  const recommended = (data?.items ?? []).filter((item) => !excludeIds.includes(item.id)).slice(0, 15)
  const pages = chunk(recommended, 5)

  function scrollToPage(index: number) {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' })
  }

  function handleScroll() {
    const el = scrollRef.current
    if (!el || el.clientWidth === 0) return
    setActivePage(Math.round(el.scrollLeft / el.clientWidth))
  }

  if (recommended.length === 0) return null

  const hasMultiplePages = pages.length > 1

  // Não existe no mobile (design-refs/Mobile/Carrinho de NFTs.png não traz esta seção).
  return (
    <section className="mt-16 hidden border-t border-brand-border/60 pt-8 lg:block">
      <h2 className="text-base font-bold text-brand-accent">Colecionadores também viram</h2>

      <div className="relative mt-6">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="scrollbar-none flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2"
        >
          {pages.map((page, pageIndex) => (
            <div
              key={pageIndex}
              className="grid w-full shrink-0 snap-start grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5"
            >
              {page.map((item) => (
                <NftCard key={item.id} nft={item} />
              ))}
            </div>
          ))}
        </div>

        {hasMultiplePages && activePage > 0 && (
          <button
            type="button"
            onClick={() => scrollToPage(activePage - 1)}
            aria-label="Ver página anterior de recomendações"
            className="absolute top-1/2 -left-4 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-brand-bg/50 text-brand-text/40 opacity-70 backdrop-blur-sm transition-all hover:bg-brand-bg/90 hover:text-[#E89B55] hover:opacity-100 focus-visible:bg-brand-bg/90 focus-visible:text-[#E89B55] focus-visible:opacity-100"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        {hasMultiplePages && activePage < pages.length - 1 && (
          <button
            type="button"
            onClick={() => scrollToPage(activePage + 1)}
            aria-label="Ver próxima página de recomendações"
            className="absolute top-1/2 -right-4 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-brand-bg/50 text-brand-text/40 opacity-70 backdrop-blur-sm transition-all hover:bg-brand-bg/90 hover:text-[#E89B55] hover:opacity-100 focus-visible:bg-brand-bg/90 focus-visible:text-[#E89B55] focus-visible:opacity-100"
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>

      {hasMultiplePages && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {pages.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => scrollToPage(index)}
              aria-label={`Ver página ${index + 1} de recomendações`}
              aria-current={activePage === index}
              className={cn(
                'size-3 rounded-full border border-brand-accent-alt transition-colors',
                activePage === index ? 'bg-brand-accent-alt' : 'bg-transparent',
              )}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = []
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size))
  return pages
}
