// Handlers REST do recurso "NFTs": listagem com busca/filtros/ordenação/paginação e detalhe
// por identificador (item 5 do desafio). A consulta reflete exatamente os parâmetros
// enviados pelo cliente — nenhum estado "escondido" no servidor mock — e trata resultado
// vazio e identificador inexistente.
import { HttpResponse, http } from 'msw'
import type { Nft, NftNetwork, PaginatedResult } from '@/types/nft'
import { getEffectiveCatalog, getEffectiveNft } from '../nft-overrides'
import { simulateNetwork } from '../network'

// Mesma ordem de categorias usada para gerar a fixture (src/mocks/data/nfts.ts) e a mesma
// ordem de redes do Figma ("Rede": Ethereum > Polygon > Solana) — os facets são computados a
// partir do catálogo real, mas a ORDEM de exibição é fixa, não a ordem de primeira ocorrência
// no array (que mudaria a cada shuffle da fixture e não bateria com o design).
const CATEGORY_ORDER = [
  'Arte digital',
  'Fotografia',
  'Música',
  'Arte 3D',
  'Colecionáveis',
  'Generativa',
  'Jogos',
  'Assinaturas',
  'Utilidade',
]
const NETWORK_ORDER: NftNetwork[] = ['ethereum', 'polygon', 'solana']

function matchesSearch(nft: Nft, search: string): boolean {
  if (!search) return true
  const term = search.toLowerCase()
  return (
    nft.name.toLowerCase().includes(term) ||
    nft.artist.toLowerCase().includes(term) ||
    nft.collection.toLowerCase().includes(term)
  )
}

export const nftHandlers = [
  http.get('/api/nfts', async ({ request }) => {
    await simulateNetwork()
    const url = new URL(request.url)
    const search = url.searchParams.get('search') ?? ''
    const category = url.searchParams.get('category')
    const network = url.searchParams.get('network') as NftNetwork | null
    const priceMin = url.searchParams.get('priceMin')
    const priceMax = url.searchParams.get('priceMax')
    const sort = url.searchParams.get('sort') ?? 'recent'
    const page = Number(url.searchParams.get('page') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '9')

    let filtered = getEffectiveCatalog().filter((nft) => matchesSearch(nft, search))
    if (category) filtered = filtered.filter((nft) => nft.category === category)
    if (network) filtered = filtered.filter((nft) => nft.network === network)
    if (priceMin) filtered = filtered.filter((nft) => Number(nft.priceEth) >= Number(priceMin))
    if (priceMax) filtered = filtered.filter((nft) => Number(nft.priceEth) <= Number(priceMax))

    const sorted = [...filtered].sort((a, b) => {
      switch (sort) {
        case 'price-asc':
          return Number(a.priceEth) - Number(b.priceEth)
        case 'price-desc':
          return Number(b.priceEth) - Number(a.priceEth)
        case 'rating':
          return b.rating - a.rating
        default:
          // "recent": a ordem de geração da fixture já simula "mais recentes primeiro"
          return 0
      }
    })

    const start = (page - 1) * pageSize
    const body: PaginatedResult<Nft> = {
      items: sorted.slice(start, start + pageSize),
      total: sorted.length,
      page,
      pageSize,
    }
    return HttpResponse.json(body)
  }),

  http.get('/api/nfts/facets', async () => {
    await simulateNetwork()
    const categories = new Map<string, number>()
    const networks = new Map<NftNetwork, number>()
    const catalog = getEffectiveCatalog()
    let priceMin = Infinity
    let priceMax = -Infinity
    for (const nft of catalog) {
      categories.set(nft.category, (categories.get(nft.category) ?? 0) + 1)
      networks.set(nft.network, (networks.get(nft.network) ?? 0) + 1)
      const price = Number(nft.priceEth)
      if (price < priceMin) priceMin = price
      if (price > priceMax) priceMax = price
    }
    return HttpResponse.json({
      categories: CATEGORY_ORDER.filter((category) => categories.has(category)).map((category) => ({
        category,
        count: categories.get(category)!,
      })),
      networks: NETWORK_ORDER.filter((network) => networks.has(network)).map((network) => ({
        network,
        count: networks.get(network)!,
      })),
      // Faixa de preço real do catálogo (item "Faixa de preço" do design) — calculada a
      // partir dos dados, não hardcoded, para não divergir se a fixture mudar.
      priceBounds: { min: Number(priceMin.toFixed(2)), max: Number(priceMax.toFixed(2)) },
    })
  }),

  http.get('/api/nfts/featured', async () => {
    await simulateNetwork()
    const featured = getEffectiveCatalog().filter((nft) => nft.isFeatured).slice(0, 1)
    return HttpResponse.json(featured[0] ?? null)
  }),

  http.get('/api/nfts/:id', async ({ params }) => {
    await simulateNetwork()
    const nft = getEffectiveNft(params.id as string)
    if (!nft) {
      return HttpResponse.json({ message: 'NFT não encontrado.' }, { status: 404 })
    }
    return HttpResponse.json(nft)
  }),
]
