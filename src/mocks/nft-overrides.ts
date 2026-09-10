// Camada de sobreposição de preço/disponibilidade por cima de NFT_CATALOG. Existe porque o
// catálogo em si é uma lista estática gerada uma vez (ver mocks/data/nfts.ts) — mudanças de
// tempo real (evento `nft.updated`) precisam de algum lugar para "morar" para que, quando o
// REST relista ou reconsulta o mesmo NFT logo em seguida, ele veja o preço/disponibilidade
// atualizado em vez do valor original. Toda leitura de NFT nos handlers (catálogo, detalhe,
// carrinho, pedidos) passa por `getEffectiveNft`/`getEffectiveCatalog` em vez de acessar
// NFT_CATALOG diretamente — é isso que garante que REST e eventos nunca divirjam (item 6 do
// desafio: "Mudanças nos dados simulados devem ser refletidas tanto nas respostas REST
// quanto nos eventos correspondentes").
import type { Nft } from '@/types/nft'
import { NFT_CATALOG } from './data/nfts'

interface NftOverride {
  priceEth?: string
  availableQuantity?: number
  version: number
}

const overrides = new Map<string, NftOverride>()

export function getNftVersion(nftId: string): number {
  return overrides.get(nftId)?.version ?? 1
}

export function getEffectiveNft(nftId: string): Nft | undefined {
  const base = NFT_CATALOG.find((candidate) => candidate.id === nftId)
  if (!base) return undefined
  return applyOverride(base)
}

export function getEffectiveCatalog(): Nft[] {
  return NFT_CATALOG.map(applyOverride)
}

function applyOverride(base: Nft): Nft {
  const override = overrides.get(base.id)
  if (!override) return base
  return {
    ...base,
    priceEth: override.priceEth ?? base.priceEth,
    availableQuantity: override.availableQuantity ?? base.availableQuantity,
    available: (override.availableQuantity ?? base.availableQuantity) > 0,
    version: override.version,
  }
}

/** Calcula a próxima versão para um novo anúncio de mudança — usado por quem decide que um
 *  NFT vai mudar de preço/disponibilidade (o "anunciante"), antes de aplicar a mudança
 *  localmente e emitir o evento com essa mesma versão. */
export function nextNftVersion(nftId: string): number {
  return getNftVersion(nftId) + 1
}

/** Aplica uma mudança de preço/disponibilidade com uma versão explícita — tanto o anunciante
 *  (que acabou de calcular `nextNftVersion`) quanto quem recebe o evento `nft.updated` pelo
 *  socket usam esta mesma função, com a mesma versão, para que os dois caminhos nunca
 *  divirjam. Versões menores ou iguais à atual são ignoradas — é a defesa contra eventos
 *  antigos ou duplicados exigida pelo item 7 do desafio. */
export function setNftOverride(
  nftId: string,
  patch: { priceEth?: string; availableQuantity?: number },
  version: number,
): boolean {
  if (version <= getNftVersion(nftId)) return false
  const current = overrides.get(nftId)
  overrides.set(nftId, { ...current, ...patch, version })
  return true
}
