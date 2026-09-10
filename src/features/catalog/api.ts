// Funções de acesso ao recurso de NFTs e favoritos. Nenhuma lógica de mock mora aqui — só a
// chamada HTTP tipada, exatamente como bateria contra uma API real.
import { http } from '@/lib/http'
import type {
  CategoryFacet,
  NetworkFacet,
  Nft,
  NftListParams,
  PaginatedResult,
  PriceBounds,
} from '@/types/nft'

function buildQuery(params: NftListParams): Record<string, string> {
  const query: Record<string, string> = {
    sort: params.sort,
    page: String(params.page),
    pageSize: String(params.pageSize),
  }
  if (params.search) query.search = params.search
  if (params.category) query.category = params.category
  if (params.network) query.network = params.network
  if (params.priceMin != null) query.priceMin = String(params.priceMin)
  if (params.priceMax != null) query.priceMax = String(params.priceMax)
  return query
}

export async function fetchNftList(
  params: NftListParams,
  signal?: AbortSignal,
): Promise<PaginatedResult<Nft>> {
  const { data } = await http.get<PaginatedResult<Nft>>('/nfts', {
    params: buildQuery(params),
    signal,
  })
  return data
}

export async function fetchNftFacets(): Promise<{
  categories: CategoryFacet[]
  networks: NetworkFacet[]
  priceBounds: PriceBounds
}> {
  const { data } = await http.get('/nfts/facets')
  return data
}

export async function fetchFeaturedNft(): Promise<Nft | null> {
  const { data } = await http.get<Nft | null>('/nfts/featured')
  return data
}

export async function fetchNftDetail(id: string): Promise<Nft> {
  const { data } = await http.get<Nft>(`/nfts/${id}`)
  return data
}

export async function fetchFavorites(): Promise<string[]> {
  const { data } = await http.get<{ nftIds: string[] }>('/favorites')
  return data.nftIds
}

export async function addFavorite(nftId: string): Promise<string[]> {
  const { data } = await http.post<{ nftIds: string[] }>(`/favorites/${nftId}`)
  return data.nftIds
}

export async function removeFavorite(nftId: string): Promise<string[]> {
  const { data } = await http.delete<{ nftIds: string[] }>(`/favorites/${nftId}`)
  return data.nftIds
}
