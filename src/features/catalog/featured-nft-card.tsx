// Card "NFT em destaque / Oferta limitada" (design-refs/Desktop/Início.png, fim da grade do
// catálogo). Usa o endpoint /nfts/featured já existente (fetchFeaturedNft) — o mesmo dado
// real do primeiro NFT com isFeatured=true, não um card decorativo hardcoded. Quando não há
// nenhum NFT marcado como destaque (ou a chamada ainda está carregando) o bloco não aparece,
// em vez de renderizar um link quebrado.
import { Link } from '@tanstack/react-router'
import { useFeaturedNft } from './use-catalog'

export function FeaturedNftCard() {
  const { data: nft, isLoading } = useFeaturedNft()

  if (isLoading) {
    return <div className="h-full min-h-[280px] animate-pulse rounded-xl bg-brand-border/30" />
  }

  if (!nft) return null

  return (
    <Link
      to="/nft/$nftId"
      params={{ nftId: nft.id }}
      className="group flex flex-col rounded-2xl border border-brand-border/60 bg-brand-card p-4"
    >
      <p className="text-xs font-bold tracking-wide text-brand-accent-alt uppercase">
        NFT em destaque
      </p>
      <p className="mt-1 text-sm font-bold text-brand-text-white uppercase">Oferta limitada</p>
      <div className="relative mt-4 aspect-square overflow-hidden rounded-xl">
        <img
          src={nft.imageUrl}
          alt={`Capa do NFT em destaque ${nft.name}`}
          className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
          loading="lazy"
        />
      </div>
    </Link>
  )
}
