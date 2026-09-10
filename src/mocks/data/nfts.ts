// Fixture determinística do catálogo. Gerada por um PRNG com seed fixa (mulberry32) — a
// mesma seed sempre produz exatamente o mesmo conjunto de NFTs, preço, raridade e
// disponibilidade, o que é exigido pelo item 6 do desafio ("cenários determinísticos") e
// necessário para baselines de regressão visual estáveis (item 9).
//
// As contagens por categoria/rede do Figma (ex.: "Arte digital (33)") eram apenas texto da
// composição visual, sem NFTs individuais correspondentes exportados — os facets exibidos
// na barra lateral são computados a partir deste conjunto gerado, não copiados do mockup.
// Documentado em ARCHITECTURE.md como decisão de dado, não de layout.
import { placeholderImage } from '@/lib/placeholder-image'
import type { Nft, NftNetwork } from '@/types/nft'

function mulberry32(seed: number) {
  let a = seed
  return function random() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const CATEGORIES = [
  'Arte digital',
  'Fotografia',
  'Música',
  'Arte 3D',
  'Colecionáveis',
  'Generativa',
  'Jogos',
  'Assinaturas',
  'Utilidade',
] as const

const NETWORKS: NftNetwork[] = ['ethereum', 'polygon', 'solana']

const ADJECTIVES = [
  'Emerald',
  'Sage',
  'Neon',
  'Cosmic',
  'Violet',
  'Ivory',
  'Golden',
  'Crimson',
  'Obsidian',
  'Amber',
  'Frost',
  'Solar',
]

const NOUNS = [
  'Ape',
  'Nomad',
  'Vessel',
  'Bloom',
  'Baron',
  'Beat',
  'Signal',
  'Frequency',
  'Drifter',
  'Oracle',
  'Relic',
  'Echo',
]

const EDITION_SETS = [
  ['1/1'],
  ['1/1', '1/10'],
  ['1/1', '1/10', '1/50'],
  ['1/1', '1/10', '1/50', 'Aberta'],
]

const ARTISTS = ['Nova Sato', 'Kai Duarte', 'Lena Moreau', 'Theo Artista', 'Iris Vance']

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos (marcas diacríticas combinantes)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function generateCatalog(count: number): Nft[] {
  const random = mulberry32(20260910)
  const items: Nft[] = []

  for (let i = 0; i < count; i++) {
    const adjective = ADJECTIVES[Math.floor(random() * ADJECTIVES.length)]
    const noun = NOUNS[Math.floor(random() * NOUNS.length)]
    const tokenNumber = String(Math.floor(random() * 900) + 100)
    const name = `${adjective} ${noun} #${tokenNumber}`
    const category = CATEGORIES[Math.floor(random() * CATEGORIES.length)]
    const network = NETWORKS[Math.floor(random() * NETWORKS.length)]
    const priceEth = (random() * 12 + 0.05).toFixed(2)
    const hasDiscount = random() < 0.15
    const compareAtPriceEth = hasDiscount
      ? (Number(priceEth) + random() * 1.5 + 0.1).toFixed(2)
      : null
    const isFeatured = random() < 0.12
    const isRare = random() < 0.18
    const availableQuantity = Math.floor(random() * 12)
    const editions = EDITION_SETS[Math.floor(random() * EDITION_SETS.length)]
    const artist = ARTISTS[Math.floor(random() * ARTISTS.length)]
    const id = `nft_${i + 1}`
    const seedImage = `${name}-${i}`

    items.push({
      id,
      tokenId: `#${String(i + 1).padStart(4, '0')}`,
      name,
      slug: `${toSlug(name)}-${id}`,
      collection: 'Kurio Apes',
      artist,
      description:
        `Um colecionável digital finalizado à mão da coleção Kurio Editions, ` +
        `verificado na ${network === 'ethereum' ? 'Ethereum' : network === 'polygon' ? 'Polygon' : 'Solana'}, ` +
        'com arte desbloqueável e acesso para colecionadores.',
      priceEth,
      compareAtPriceEth,
      imageUrl: placeholderImage(seedImage, name),
      gallery: [
        placeholderImage(`${seedImage}-1`, name),
        placeholderImage(`${seedImage}-2`, name),
        placeholderImage(`${seedImage}-3`, name),
        placeholderImage(`${seedImage}-4`, name),
      ],
      category,
      network,
      rating: Number((random() * 1.5 + 3.5).toFixed(1)),
      reviewCount: Math.floor(random() * 40) + 1,
      attributes: ['Óculos', 'Esmeralda', isRare ? 'Raro' : 'Comum'],
      editions,
      available: availableQuantity > 0,
      availableQuantity,
      isFeatured,
      isRare,
      version: 1,
    })
  }

  return items
}

export const NFT_CATALOG: Nft[] = generateCatalog(64)
