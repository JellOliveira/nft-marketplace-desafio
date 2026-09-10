// Card de NFT do catálogo (grid de 3 colunas no desktop, 1 no mobile — ver
// design-refs/Desktop/Início.png e Products.svg). No Figma o card não tem plano de fundo
// próprio: só a foto é arredondada (rx 15 num tile ~250px) e o título/preço ficam soltos no
// fundo da página logo abaixo, sem card nem nome do artista. Favoritar só existe dentro da
// página de detalhe do NFT — não há coração sobre a miniatura do catálogo.
import { Link } from '@tanstack/react-router'
import type { Nft } from '@/types/nft'

export function NftCard({ nft }: { nft: Nft }) {
  return (
    <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-brand-card">
        <img
          src={nft.imageUrl}
          alt={`Capa do NFT ${nft.name}`}
          className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
          loading="lazy"
          width={600}
          height={600}
        />

        {nft.isRare && (
          <span className="absolute top-3 left-3 rounded-md bg-brand-accent-alt px-2.5 py-1 text-xs font-bold text-brand-bg">
            RARO
          </span>
        )}

        {!nft.available && (
          <div className="absolute inset-0 flex items-center justify-center bg-brand-bg/70">
            <span className="text-sm font-bold text-brand-text-white">Esgotado</span>
          </div>
        )}
      </div>

      <div className="mt-4">
        <h3 className="truncate text-base font-bold text-brand-text">{nft.name}</h3>
        <p className="mt-1 flex items-baseline gap-2">
          <span className="text-lg font-normal text-brand-accent-alt">{nft.priceEth} ETH</span>
          {nft.compareAtPriceEth && (
            <span className="text-sm text-brand-muted line-through">{nft.compareAtPriceEth} ETH</span>
          )}
        </p>
      </div>
    </Link>
  )
}
