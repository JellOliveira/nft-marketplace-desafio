import type { NftListParams } from '@/types/nft'

// Catálogo é dado público (não varia por usuário), então essas chaves não levam userId — ao
// contrário de carrinho, pedidos e perfil, que vão precisar do prefixo `userScope` quando
// forem implementados.
export const catalogKeys = {
  list: (params: NftListParams) => ['nfts', 'list', params] as const,
  facets: ['nfts', 'facets'] as const,
  featured: ['nfts', 'featured'] as const,
  detail: (id: string) => ['nfts', 'detail', id] as const,
}
