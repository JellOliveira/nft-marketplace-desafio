// Detalhe do NFT (design-refs/Código do Detalhes do NFT.html + Detalhes do NFT.png): galeria,
// informações, seleção de edição, quantidade, favoritos e compra. Suporta acesso direto e
// trata NFT inexistente com uma tela de erro dedicada, em vez de deixar a página em branco ou
// quebrar (item 3 do desafio).
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import axios from 'axios'
import { ChevronLeft, ChevronRight, Heart, Mail, Minus, Plus, Star } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAddCartItem } from '@/features/cart/use-cart'
import { NftCard } from '@/features/catalog/nft-card'
import { useNftDetail, useNftList } from '@/features/catalog/use-catalog'
import { useFavorites, useToggleFavorite } from '@/features/catalog/use-favorites'
import { setLastViewedNftId } from '@/features/catalog/use-last-viewed-nft'
import { useSession } from '@/features/auth/use-session'
import { cn } from '@/lib/utils'
import { DEFAULT_CATALOG_SEARCH } from '@/types/nft'
import type { Nft } from '@/types/nft'

export const Route = createFileRoute('/nft/$nftId')({
  component: NftDetailPage,
})

function NftDetailPage() {
  const { nftId } = Route.useParams()
  const { data: nft, isLoading, isError } = useNftDetail(nftId)

  // Guarda o último NFT visitado (localStorage) — é o que o link "Mercado" do header passa
  // a apontar (ver use-last-viewed-nft.ts e site-header.tsx).
  useEffect(() => {
    if (nft) setLastViewedNftId(nft.id)
  }, [nft])

  if (isLoading) return <DetailSkeleton />

  if (isError || !nft) {
    return (
      <main className="mx-auto max-w-[1200px] px-5 py-20 text-center lg:px-[120px]">
        <h1 className="text-2xl font-bold text-brand-text">NFT não encontrado</h1>
        <p className="mt-2 text-brand-muted">
          O item que você está procurando não existe ou foi removido do catálogo.
        </p>
        <Link
          to="/" search={DEFAULT_CATALOG_SEARCH}
          className="mt-6 inline-block rounded-md bg-brand-accent-alt px-4 py-2 text-sm font-medium text-brand-card"
        >
          Voltar ao catálogo
        </Link>
      </main>
    )
  }

  return <NftDetailContent nft={nft} />
}

function DetailSkeleton() {
  return (
    <main className="mx-auto max-w-[1200px] px-5 py-10 lg:px-[120px]">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[520px_1fr]">
        <Skeleton className="aspect-square w-full rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-1/2" />
        </div>
      </div>
    </main>
  )
}

function NftDetailContent({ nft }: { nft: NonNullable<ReturnType<typeof useNftDetail>['data']> }) {
  const navigate = useNavigate()
  const { isAuthenticated } = useSession()
  const { data: favoriteIds } = useFavorites()
  const toggleFavorite = useToggleFavorite()
  const addCartItem = useAddCartItem()

  // Índice, não a URL da imagem: a galeria repete a mesma foto do produto nas 4 miniaturas
  // (design-refs/Detalhes do NFT.png), então comparar por valor marcaria todas como ativas.
  const [activeIndex, setActiveIndex] = useState(0)
  const activeImage = nft.gallery[activeIndex] ?? nft.imageUrl
  const [edition, setEdition] = useState(nft.editions[nft.editions.length - 1])
  const [quantity, setQuantity] = useState(1)
  const [feedback, setFeedback] = useState<string | null>(null)

  const isFavorited = Boolean(favoriteIds?.includes(nft.id))
  const maxQuantity = Math.max(1, nft.availableQuantity)

  function handleBuy() {
    setFeedback(null)
    addCartItem.mutate(
      { nftId: nft.id, edition, quantity },
      {
        onSuccess: () => navigate({ to: '/carrinho' }),
        onError: (error) => {
          const message = axios.isAxiosError(error)
            ? (error.response?.data as { message?: string } | undefined)?.message
            : null
          setFeedback(message ?? 'Não foi possível adicionar ao carrinho agora.')
        },
      },
    )
  }

  return (
    <main className="mx-auto max-w-[1200px] px-5 py-10 lg:px-[120px]">
      {/* Breadcrumb fixo em "Mercado": não há tela de categoria própria nesta entrega, então
       *  ele reflete o link "Mercado" do header (agora funcional), não a categoria do item. */}
      <nav aria-label="Trilha de navegação" className="mb-6 text-sm text-brand-muted">
        <Link to="/" search={DEFAULT_CATALOG_SEARCH} className="hover:text-brand-text">
          Início
        </Link>
        <span className="mx-2">/</span>
        <span>Mercado</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[104px_520px_1fr]">
        <div className="order-2 flex gap-3 lg:order-1 lg:flex-col">
          {nft.gallery.map((image, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Ver imagem ${index + 1} de ${nft.name}`}
              aria-pressed={activeIndex === index}
              className={cn(
                'size-24 shrink-0 overflow-hidden rounded-lg border-2 transition-colors',
                activeIndex === index ? 'border-brand-accent-alt' : 'border-transparent',
              )}
            >
              <img src={image} alt="" className="size-full object-cover" width={96} height={96} />
            </button>
          ))}
        </div>

        <div className="order-1 aspect-square overflow-hidden rounded-xl lg:order-2">
          <img
            src={activeImage}
            alt={`Imagem principal do NFT ${nft.name}`}
            className="size-full object-cover"
            width={520}
            height={520}
          />
        </div>

        <div className="order-3 min-w-0">
          <h1 className="text-2xl font-bold text-brand-text">{nft.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-xl text-brand-accent-alt">{nft.priceEth} ETH</span>
            <span className="flex items-center gap-1.5 text-sm whitespace-nowrap text-brand-muted">
              <RatingStars rating={nft.rating} />
              {nft.reviewCount} avaliações de colecionadores
            </span>
          </p>

          <h2 className="mt-4 text-sm font-bold text-brand-text">Sobre este NFT:</h2>
          <p className="mt-1 text-sm text-brand-muted">{nft.description}</p>

          <h2 className="mt-4 text-sm font-bold text-brand-text">Edição:</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {nft.editions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setEdition(option)}
                aria-pressed={edition === option}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm uppercase',
                  edition === option
                    ? 'border-brand-accent-alt text-brand-accent-alt'
                    : 'border-brand-border text-brand-text',
                )}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Diminuir quantidade"
                disabled={quantity <= 1}
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                className="flex size-8 items-center justify-center rounded-full bg-brand-accent-alt text-brand-card disabled:opacity-50"
              >
                <Minus size={16} />
              </button>
              <span className="w-6 text-center text-brand-text">{quantity}</span>
              <button
                type="button"
                aria-label="Aumentar quantidade"
                disabled={quantity >= maxQuantity}
                title={quantity >= maxQuantity ? 'Limite de unidades disponíveis atingido' : undefined}
                onClick={() => setQuantity((current) => Math.min(maxQuantity, current + 1))}
                className="flex size-8 items-center justify-center rounded-full bg-brand-accent-alt text-brand-card disabled:opacity-50"
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Comprar + Favoritar lado a lado, mesmo tamanho (design-refs: "w-32 h-10" nos
             *  dois) — Favoritar é vazado (só borda), Comprar é sólido. */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={handleBuy}
                disabled={!nft.available || addCartItem.isPending}
                className="h-10 w-32 bg-brand-accent-alt text-brand-card hover:bg-brand-accent"
              >
                {nft.available ? 'Comprar' : 'Esgotado'}
              </Button>

              <button
                type="button"
                onClick={() => isAuthenticated && toggleFavorite.mutate({ nftId: nft.id, isFavorited })}
                disabled={!isAuthenticated || toggleFavorite.isPending}
                aria-pressed={isFavorited}
                aria-label={isFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                title={isAuthenticated ? undefined : 'Entre para favoritar'}
                className="flex h-10 w-32 items-center justify-center gap-2 rounded-md border border-brand-accent-alt text-sm font-medium text-brand-accent-alt disabled:cursor-not-allowed"
              >
                <Heart size={16} className={cn(isFavorited && 'fill-brand-accent-alt')} />
                Favoritar
              </button>
            </div>
          </div>

          {feedback && (
            <p role="alert" className="mt-3 text-sm text-brand-error">
              {feedback}
            </p>
          )}

          <dl className="mt-4 space-y-1 text-sm text-brand-muted">
            <div>
              <dt className="inline">ID do token: </dt>
              <dd className="inline">{nft.tokenId}</dd>
            </div>
            <div>
              <dt className="inline">Coleção: </dt>
              <dd className="inline">{nft.collection}</dd>
            </div>
            <div>
              <dt className="inline">Atributos: </dt>
              <dd className="inline">{nft.attributes.join(', ')}</dd>
            </div>
          </dl>

          <ShareRow nft={nft} />
        </div>
      </div>

      <DetailsSection nft={nft} />
      <RelatedCollectionSection nft={nft} />
    </main>
  )
}

/** Estrelas de avaliação (design-refs/Detalhes do NFT.png): 5 ícones fixos, preenchidos em
 *  laranja até o valor arredondado de `rating`, o restante em cinza — em vez de um texto
 *  "★★★★" que varia de fonte pra fonte e não mostra as vazias. */
function RatingStars({ rating }: { rating: number }) {
  const filled = Math.round(rating)
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          size={14}
          className={index < filled ? 'fill-brand-accent-alt text-brand-accent-alt' : 'text-brand-muted'}
        />
      ))}
    </span>
  )
}

/** "Compartilhar este NFT:" (design-refs/Código do Detalhes do NFT.html): LinkedIn, e-mail e
 *  Twitter. Sem backend de compartilhamento nesta entrega — os links abrem os destinos reais
 *  (mailto: e as intents padrão de compartilhamento das redes), então não é decorativo. */
function ShareRow({ nft }: { nft: Nft }) {
  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
  const shareText = `Dá uma olhada em ${nft.name} na Kurio`

  return (
    <div className="mt-6 flex items-center gap-3 text-sm">
      <span className="font-bold text-brand-text">Compartilhar este NFT:</span>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Compartilhar no LinkedIn"
        className="text-brand-text hover:text-brand-accent-alt"
      >
        <LinkedinGlyph className="size-4" />
      </a>
      <a
        href={`mailto:?subject=${encodeURIComponent(nft.name)}&body=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
        aria-label="Compartilhar por e-mail"
        className="text-brand-text hover:text-brand-accent-alt"
      >
        <Mail className="size-4" />
      </a>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Compartilhar no Twitter"
        className="text-brand-text hover:text-brand-accent-alt"
      >
        <TwitterGlyph className="size-4" />
      </a>
    </div>
  )
}

function LinkedinGlyph(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={props.className} aria-hidden>
      <path d="M4.98 3.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM3.5 9h3v11.5h-3V9Zm6.5 0h2.9v1.6h.04c.4-.75 1.4-1.6 2.9-1.6 3.1 0 3.66 2 3.66 4.6v6.9h-3v-6.1c0-1.46-.03-3.3-2-3.3-2 0-2.3 1.6-2.3 3.2v6.2h-3V9Z" />
    </svg>
  )
}

function TwitterGlyph(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={props.className} aria-hidden>
      <path d="M20 5.9c-.7.3-1.4.5-2.2.6.8-.5 1.4-1.2 1.6-2.2-.7.4-1.6.8-2.4.9a3.7 3.7 0 0 0-6.4 3.4A10.6 10.6 0 0 1 3 4.9a3.7 3.7 0 0 0 1.2 5 3.7 3.7 0 0 1-1.7-.5v.1a3.7 3.7 0 0 0 3 3.6 3.8 3.8 0 0 1-1.7.1 3.7 3.7 0 0 0 3.5 2.6A7.5 7.5 0 0 1 2 17.3a10.6 10.6 0 0 0 5.7 1.7c6.9 0 10.6-5.7 10.6-10.6v-.5c.7-.5 1.3-1.2 1.7-2Z" />
    </svg>
  )
}

/** Seção "Detalhes do NFT" / "Avaliações de colecionadores" (design-refs/Código do Detalhes
 *  do NFT.html). A aba de avaliações não tem tela/dado próprio nesta entrega — fica marcada
 *  como fora do escopo em vez de simular uma lista de avaliações que não existe. */
function DetailsSection({ nft }: { nft: Nft }) {
  return (
    <section className="mt-16 border-t border-brand-border/60 pt-8">
      <div className="flex items-center gap-6 text-sm">
        <span className="border-b-2 border-brand-accent-alt pb-2 font-bold text-brand-accent-alt">
          Detalhes do NFT
        </span>
        <span
          aria-disabled="true"
          title="Fora do escopo desta entrega"
          className="cursor-not-allowed pb-2 text-brand-text/50"
        >
          Avaliações de colecionadores ({nft.reviewCount})
        </span>
      </div>

      {/* Texto fixo (design-refs/Detalhes do NFT.png) — só o nome do produto muda de um NFT
       *  para outro, o resto da redação é igual em todos, incluindo os rótulos "Rede:" /
       *  "Contrato:" / "Direitos autorais:" (o conteúdo de cada um é o do próprio Figma,
       *  mesmo quando o rótulo não bate topicamente com o texto abaixo dele). */}
      <p className="mt-6 max-w-3xl text-sm leading-6 text-brand-muted">
        {nft.name} é uma obra digital 1/50 finalizada à mão da coleção Kurio Editions. Cada
        atributo fica armazenado nos metadados do token e verificado na Ethereum. A obra
        explora identidade, movimento e luz em um mundo digital sem fronteiras.
        <br />
        <br />
        A propriedade inclui a arte em alta resolução, lançamentos exclusivos para
        colecionadores e um registro permanente de procedência registrada na rede. Nova Sato
        recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e
        lançamentos da comunidade.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-bold text-brand-text">Rede:</h3>
          <p className="mt-1 max-w-3xl text-sm text-brand-muted">
            Cunhado na Ethereum com procedência imutável e metadados armazenados no IPFS.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-bold text-brand-text">Contrato:</h3>
          <p className="mt-1 max-w-3xl text-sm text-brand-muted">
            Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente
            pelos mercados compatíveis.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-bold text-brand-text">Direitos autorais:</h3>
          <p className="mt-1 max-w-3xl text-sm text-brand-muted">
            0x7A42...19E8 • Contrato inteligente ERC-721 verificado.
          </p>
        </div>
      </div>
    </section>
  )
}

/** "Mais desta coleção" (design-refs/Detalhes do NFT.png): outros NFTs da mesma coleção,
 *  paginados de 5 em 5 com 3 bolinhas embaixo — igual ao carrossel do Figma. Sem endpoint
 *  dedicado — reaproveita a listagem real do catálogo e filtra no cliente, em vez de
 *  inventar uma API que não existe. A rolagem lateral é de verdade (overflow-x com
 *  scroll-snap, arrastável por toque/trackpad); as bolinhas navegam para a página
 *  correspondente e refletem a posição real do scroll, não são decorativas. */
function RelatedCollectionSection({ nft }: { nft: Nft }) {
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

  const related = (data?.items ?? [])
    .filter((item) => item.collection === nft.collection && item.id !== nft.id)
    .slice(0, 15)
  const pages = chunk(related, 5)

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

  if (related.length === 0) return null

  const hasMultiplePages = pages.length > 1

  return (
    <section className="mt-16 border-t border-brand-border/60 pt-8">
      <h2 className="text-lg font-bold text-brand-text">Mais desta coleção</h2>

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

        {/* Setas discretas — um fundo suave garante contraste sobre qualquer arte de NFT atrás
         *  (clara ou escura); apagadas por padrão, ganham opacidade e a cor de destaque no
         *  hover/foco (identidade visual do site, não a barra de rolagem nativa do SO). */}
        {hasMultiplePages && activePage > 0 && (
          <button
            type="button"
            onClick={() => scrollToPage(activePage - 1)}
            aria-label="Ver página anterior de mais desta coleção"
            className="absolute top-1/2 -left-4 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-brand-bg/50 text-brand-text/40 opacity-70 backdrop-blur-sm transition-all hover:bg-brand-bg/90 hover:text-[#E89B55] hover:opacity-100 focus-visible:bg-brand-bg/90 focus-visible:text-[#E89B55] focus-visible:opacity-100"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        {hasMultiplePages && activePage < pages.length - 1 && (
          <button
            type="button"
            onClick={() => scrollToPage(activePage + 1)}
            aria-label="Ver próxima página de mais desta coleção"
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
              aria-label={`Ver página ${index + 1} de mais desta coleção`}
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
