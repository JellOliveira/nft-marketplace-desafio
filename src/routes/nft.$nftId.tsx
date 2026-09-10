// Detalhe do NFT (design-refs/Desktop/Detalhes do NFT.png): galeria, informações, seleção
// de edição, quantidade, favoritos e compra. Suporta acesso direto e trata NFT inexistente
// com uma tela de erro dedicada, em vez de deixar a página em branco ou quebrar (item 3 do
// desafio).
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import axios from 'axios'
import { Heart, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAddCartItem } from '@/features/cart/use-cart'
import { useNftDetail } from '@/features/catalog/use-catalog'
import { useFavorites, useToggleFavorite } from '@/features/catalog/use-favorites'
import { useSession } from '@/features/auth/use-session'
import { cn } from '@/lib/utils'
import { DEFAULT_CATALOG_SEARCH } from '@/types/nft'

export const Route = createFileRoute('/nft/$nftId')({
  component: NftDetailPage,
})

function NftDetailPage() {
  const { nftId } = Route.useParams()
  const { data: nft, isLoading, isError } = useNftDetail(nftId)

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
      <nav aria-label="Trilha de navegação" className="mb-6 text-sm text-brand-muted">
        <Link to="/" search={DEFAULT_CATALOG_SEARCH} className="hover:text-brand-text">
          Início
        </Link>
        <span className="mx-2">/</span>
        <span>{nft.category}</span>
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
            <span className="text-xl text-brand-gold">{nft.priceEth} ETH</span>
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

            <Button
              type="button"
              onClick={handleBuy}
              disabled={!nft.available || addCartItem.isPending}
              className="bg-brand-accent-alt text-brand-card hover:bg-brand-accent"
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
              className="flex items-center gap-2 text-sm text-brand-text disabled:opacity-50"
            >
              <Heart size={18} className={cn(isFavorited && 'fill-brand-accent-alt text-brand-accent-alt')} />
              Favoritar
            </button>
          </div>

          {feedback && (
            <p role="alert" className="mt-3 text-sm text-brand-error">
              {feedback}
            </p>
          )}

          <dl className="mt-6 space-y-1 text-sm text-brand-muted">
            <div>
              <dt className="inline">ID do token: </dt>
              <dd className="inline text-brand-text">{nft.tokenId}</dd>
            </div>
            <div>
              <dt className="inline">Coleção: </dt>
              <dd className="inline text-brand-text">{nft.collection}</dd>
            </div>
            <div>
              <dt className="inline">Atributos: </dt>
              <dd className="inline text-brand-text">{nft.attributes.join(', ')}</dd>
            </div>
          </dl>
        </div>
      </div>
    </main>
  )
}
