// Contratos do recurso "NFTs" (item 5 do desafio): listagem com busca/filtros/ordenação/
// paginação e detalhe por identificador. Compartilhado entre os handlers MSW, a camada de
// API (Axios) e os componentes de catálogo/detalhe.

export type NftNetwork = 'ethereum' | 'polygon' | 'solana'

export interface Nft {
  id: string
  tokenId: string
  name: string
  /** Slug legível usado na URL de detalhe (ex.: "emerald-ape-042"). */
  slug: string
  collection: string
  artist: string
  description: string
  /** Preço atual, sempre como string decimal — nunca number — para preservar precisão em
   *  ETH (item 3 do desafio: "Valores em ETH devem trafegar como strings decimais"). */
  priceEth: string
  /** Preço anterior (exibido riscado) quando o item está com desconto ativo. */
  compareAtPriceEth: string | null
  imageUrl: string
  gallery: string[]
  category: string
  network: NftNetwork
  rating: number
  reviewCount: number
  attributes: string[]
  /** Edições disponíveis para compra (ex.: "1/1", "1/10", "1/50", "Aberta"). */
  editions: string[]
  available: boolean
  availableQuantity: number
  isFeatured: boolean
  isRare: boolean
  /** Incrementado a cada alteração de preço/disponibilidade — usado pelo cliente para
   *  ignorar eventos de tempo real antigos ou duplicados (item 7 do desafio). */
  version: number
}

export type NftSortOption = 'recent' | 'price-asc' | 'price-desc' | 'rating'

/** Parâmetros de consulta do catálogo — o mesmo formato trafega na URL (search params da
 *  rota), na chamada Axios e na query string interpretada pelo handler MSW, garantindo que
 *  o estado da tela, o histórico do navegador e a API concordem sobre "o que está sendo
 *  exibido" (item 3 do desafio). */
export interface NftListParams {
  search: string
  category: string | null
  network: NftNetwork | null
  priceMin: number | null
  priceMax: number | null
  sort: NftSortOption
  page: number
  pageSize: number
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

/** Formato exato do search-param da rota "/" (catálogo). Compartilhado para que qualquer
 *  <Link to="/"> fora da própria página do catálogo (header, breadcrumbs, estados vazios)
 *  possa linkar de volta usando o mesmo objeto de estado padrão, sem repetir os valores. */
export interface CatalogSearch {
  q: string
  category: string | null
  network: NftNetwork | null
  priceMin: number | null
  priceMax: number | null
  sort: NftSortOption
  page: number
}

export const DEFAULT_CATALOG_SEARCH: CatalogSearch = {
  q: '',
  category: null,
  network: null,
  priceMin: null,
  priceMax: null,
  sort: 'recent',
  page: 1,
}

export interface CategoryFacet {
  category: string
  count: number
}

export interface NetworkFacet {
  network: NftNetwork
  count: number
}

export interface PriceBounds {
  min: number
  max: number
}
