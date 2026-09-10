// Card de NFT do catálogo (grid de 3 colunas no desktop, 1 no mobile — ver
// design-refs/Desktop/Início.png). O coração de favoritar fica sempre visível, não só no
// hover como no Figma: um controle interativo que só aparece ao passar o mouse é
// inoperável por teclado, o que viola o requisito de navegação por teclado do item 8 do
// desafio — desvio documentado em ARCHITECTURE.md.
import { Link } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import type { MouseEvent } from 'react'
import { useSession } from '@/features/auth/use-session'
import { cn } from '@/lib/utils'
import type { Nft } from '@/types/nft'
import { useFavorites, useToggleFavorite } from './use-favorites'

export function NftCard({ nft }: { nft: Nft }) {
  const { isAuthenticated } = useSession()
  const { data: favoriteIds } = useFavorites()
  const toggleFavorite = useToggleFavorite()

  const isFavorited = Boolean(favoriteIds?.includes(nft.id))

  function handleFavoriteClick(event: MouseEvent) {
    event.preventDefault()
    if (!isAuthenticated) return // header já expõe o caminho de login; card não redireciona sozinho
    toggleFavorite.mutate({ nftId: nft.id, isFavorited })
  }

  return (
    <Link
      to="/nft/$nftId"
      params={{ nftId: nft.id }}
      className="group block overflow-hidden rounded-xl bg-brand-card shadow-[0_6.6px_19.8px_-3.3px_rgba(20,13,10,0.15)]"
    >
      <div className="relative aspect-square overflow-hidden">
        <img
          src={nft.imageUrl}
          alt={`Capa do NFT ${nft.name}`}
          className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
          loading="lazy"
          width={600}
          height={600}
        />

        {nft.isRare && (
          <span className="absolute top-3 left-3 rounded bg-brand-accent-alt px-2 py-1 text-xs font-bold text-brand-card">
            RARO
          </span>
        )}

        <button
          type="button"
          onClick={handleFavoriteClick}
          disabled={!isAuthenticated || toggleFavorite.isPending}
          aria-pressed={isFavorited}
          aria-label={isFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          title={isAuthenticated ? undefined : 'Entre para favoritar'}
          className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-brand-bg/70 text-brand-text-white backdrop-blur-sm transition-colors hover:bg-brand-bg disabled:opacity-50"
        >
          <Heart size={16} className={cn(isFavorited && 'fill-brand-accent-alt text-brand-accent-alt')} />
        </button>

        {!nft.available && (
          <div className="absolute inset-0 flex items-center justify-center bg-brand-bg/70">
            <span className="text-sm font-bold text-brand-text-white">Esgotado</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="truncate text-base font-bold text-brand-text">{nft.name}</h3>
        <p className="truncate text-sm text-brand-muted">{nft.artist}</p>
        <p className="mt-1 flex items-baseline gap-2">
          <span className="text-lg font-normal text-brand-gold">{nft.priceEth} ETH</span>
          {nft.compareAtPriceEth && (
            <span className="text-sm text-brand-muted line-through">{nft.compareAtPriceEth} ETH</span>
          )}
        </p>
      </div>
    </Link>
  )
}
