// Detalhe do NFT (design-refs/Código do Detalhes do NFT.html + Detalhes do NFT.png): galeria,
// informações, seleção de edição, quantidade, favoritos e compra. Suporta acesso direto e
// trata NFT inexistente com uma tela de erro dedicada, em vez de deixar a página em branco ou
// quebrar (item 3 do desafio).
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import axios from 'axios'
import { Heart, Mail, Minus, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
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

  const [activeImage, setActiveImage] = useState(nft.imageUrl)
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

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[100px_520px_1fr]">
        <div className="order-2 flex gap-3 lg:order-1 lg:flex-col">
          {nft.gallery.map((image, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setActiveImage(image)}
              className={cn(
                'size-20 shrink-0 overflow-hidden rounded-lg border-2 transition-colors',
                activeImage === image ? 'border-brand-accent-alt' : 'border-transparent',
              )}
            >
              <img src={image} alt="" className="size-full object-cover" width={80} height={80} />
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
          <p className="mt-2 flex items-baseline gap-3">
            <span className="text-xl text-brand-accent-alt">{nft.priceEth} ETH</span>
            <span className="text-sm text-brand-muted">
              {'★'.repeat(Math.round(nft.rating))} {nft.reviewCount} avaliações de colecionadores
            </span>
          </p>

          <h2 className="mt-6 text-sm font-bold text-brand-text">Sobre este NFT:</h2>
          <p className="mt-1 text-sm text-brand-muted">{nft.description}</p>

          <h2 className="mt-6 text-sm font-bold text-brand-text">Edição:</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {nft.editions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setEdition(option)}
                aria-pressed={edition === option}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm',
                  edition === option
                    ? 'border-brand-accent-alt text-brand-accent-alt'
                    : 'border-brand-border text-brand-text',
                )}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
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
                className="flex h-10 w-32 items-center justify-center gap-2 rounded-md border border-brand-accent-alt text-sm font-medium text-brand-accent-alt disabled:opacity-50"
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

          <dl className="mt-6 space-y-1 text-sm text-brand-muted">
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

      <p className="mt-6 max-w-3xl text-sm leading-6 text-brand-muted">
        {nft.description}
        <br />
        <br />
        Cada peça desta coleção é cunhada com metadados verificáveis on-chain, garantindo
        proveniência e raridade auditáveis por qualquer colecionador.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div>
          <h3 className="text-sm font-bold text-brand-text">Rede:</h3>
          <p className="mt-1 text-sm text-brand-muted capitalize">{nft.network}</p>
        </div>
        <div>
          <h3 className="text-sm font-bold text-brand-text">Contrato:</h3>
          <p className="mt-1 text-sm text-brand-muted">ERC-721</p>
        </div>
        <div>
          <h3 className="text-sm font-bold text-brand-text">Direitos autorais:</h3>
          <p className="mt-1 text-sm text-brand-muted">10% para o criador em cada revenda</p>
        </div>
      </div>

      <p className="mt-4 text-xs text-brand-muted">
        0x7A42…19E8 • Contrato inteligente ERC-721 verificado.
      </p>
    </section>
  )
}

/** "Mais desta coleção" (design-refs/Código do Detalhes do NFT.html): outros NFTs da mesma
 *  coleção. Sem endpoint dedicado — reaproveita a listagem real do catálogo e filtra no
 *  cliente, em vez de inventar uma API que não existe. */
function RelatedCollectionSection({ nft }: { nft: Nft }) {
  const { data } = useNftList({
    search: '',
    category: null,
    network: null,
    priceMin: null,
    priceMax: null,
    sort: 'recent',
    page: 1,
    pageSize: 24,
  })

  const related = (data?.items ?? []).filter((item) => item.collection === nft.collection && item.id !== nft.id).slice(0, 5)

  if (related.length === 0) return null

  return (
    <section className="mt-16 border-t border-brand-border/60 pt-8">
      <h2 className="text-lg font-bold text-brand-text">Mais desta coleção</h2>
      <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
        {related.map((item) => (
          <NftCard key={item.id} nft={item} />
        ))}
      </div>
    </section>
  )
}
