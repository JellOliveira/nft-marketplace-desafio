// "Banco de dados" da camada de mocks: um estado único, persistido em localStorage, que os
// handlers do MSW leem e escrevem. Centralizar aqui (em vez de cada handler guardar estado
// próprio em memória) é o que garante o que o item 6 do desafio pede: catálogo, favoritos,
// carrinho, perfil, carteiras e pedidos permanecem consistentes entre si, e a persistência
// local sustenta um refresh de página sem perder o cenário simulado.
import type { User } from '@/types/auth'
import type { Wallet } from '@/types/profile'

/** Registro de usuário como fica persistido no mock — inclui o hash da senha, nunca a senha
 *  em claro (ver src/lib/crypto.ts). Os campos de perfil estendido (username, ENS) moram
 *  aqui também — é o mesmo registro que a sessão e o perfil leem, só com visões diferentes
 *  do que é exposto publicamente. */
export interface StoredUser extends User {
  passwordHash: string
  username: string
  ensName: string | null
}

/** Formato completo do estado simulado. Cada fase do projeto adiciona suas próprias
 *  coleções aqui (nfts, favoritos, carrinho, pedidos, carteiras) — mantendo tudo num único
 *  objeto serializável, o reset de cenário (item 6) vira uma única substituição atômica. */
/** Uma linha do carrinho como fica persistida — só a referência ao NFT, edição e
 *  quantidade. Preço, disponibilidade e totais são sempre recalculados na leitura a partir
 *  do catálogo atual, nunca congelados aqui (é o catálogo que reflete eventos de tempo real). */
export interface StoredCartLine {
  nftId: string
  edition: string
  quantity: number
}

export interface StoredCart {
  lines: StoredCartLine[]
  couponCode: string | null
  quoteVersion: number
}

/** Um pedido como fica persistido. `status` só muda dentro do próprio mock (ver
 *  src/mocks/handlers/orders.ts) — nunca é escrito pelo cliente, exatamente como uma
 *  simulação de backend real se comportaria. */
export interface StoredOrder {
  id: string
  ownerKey: string
  status: 'pending' | 'confirmed' | 'refused'
  createdAt: number
  version: number
  lines: {
    nftId: string
    name: string
    imageUrl: string
    edition: string
    quantity: number
    priceEth: string
  }[]
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalEth: string
  couponCode: string | null
  walletAddress: string
  walletType: string
  network: string
  transactionHash: string
  /** Cenário determinístico: força o pedido a terminar como "refused" em vez de
   *  "confirmed" — escolhido pelo usuário na tela de pagamento, não sorteado. */
  simulateRefusal: boolean
  /** Evita remover os itens do carrinho mais de uma vez quando o pedido é consultado
   *  repetidamente após confirmado. */
  cartCleared: boolean
}

export interface MockDatabase {
  users: StoredUser[]
  /** token de sessão -> id do usuário autenticado por ele */
  sessions: Record<string, string>
  /** id do usuário -> ids de NFT favoritados. Isolado por usuário (nunca uma chave global). */
  favorites: Record<string, string[]>
  /** chave = id do usuário autenticado OU id de visitante (ver src/lib/guest-id.ts). */
  carts: Record<string, StoredCart>
  /** id do pedido -> pedido. */
  orders: Record<string, StoredOrder>
  /** chave = "{ownerKey}:{Idempotency-Key}" -> id do pedido + hash do corpo da requisição
   *  original. Garante que reenviar a mesma tentativa devolve o mesmo pedido, e que reusar
   *  a chave com conteúdo diferente gera conflito (item 5 do desafio). */
  idempotency: Record<string, { orderId: string; requestHash: string }>
  /** id do usuário -> carteiras cadastradas. Isolado por usuário, como favoritos e carrinho. */
  wallets: Record<string, { primary?: Wallet; secondary?: Wallet }>
}

const STORAGE_KEY = 'nft-marketplace:mock-db'

/** Estado inicial determinístico. Dois usuários fixos — exigido pelo item 6 do desafio para
 *  exercitar isolamento de dados entre contas diferentes. Os hashes abaixo correspondem às
 *  senhas de exemplo documentadas no README (credenciais fictícias, nunca reais). */
function createSeed(): MockDatabase {
  return {
    users: [
      {
        id: 'user_colecionador',
        name: 'Ana Colecionadora',
        username: 'ana.colecionadora',
        email: 'colecionadora@kurio.app',
        ensName: null,
        avatarUrl: null,
        // senha de exemplo: "colecionador123" (ver README.md, seção de credenciais fictícias)
        passwordHash:
          '34e0ef976b88df454092580bea9112bd07aa98e128a3e57978743d101c578c53',
      },
      {
        id: 'user_artista',
        name: 'Theo Artista',
        username: 'theo.artista',
        email: 'artista@kurio.app',
        ensName: null,
        avatarUrl: null,
        // senha de exemplo: "artista456" (ver README.md, seção de credenciais fictícias)
        passwordHash:
          'd22aba7160f246fae4078c7b8ac02f4ca8f444565517820bd89e2d0abb1da0ce',
      },
    ],
    sessions: {},
    favorites: {},
    carts: {},
    orders: {},
    wallets: {},
    idempotency: {},
  }
}

let cache: MockDatabase | null = null

/** Lê o estado atual, carregando do localStorage na primeira chamada e mantendo em memória
 *  depois disso (evita serializar/desserializar a cada requisição mockada). */
export function readDb(): MockDatabase {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    // `?? createSeed()` acima cobre a ausência total do registro; o spread abaixo cobre uma
    // versão mais antiga do estado salvo no navegador, sem uma coleção adicionada depois
    // (ex.: alguém que testou o app antes da fase de favoritos existir) — evita que o app
    // quebre por causa de um localStorage desatualizado em vez de corrompido.
    cache = raw ? { ...createSeed(), ...(JSON.parse(raw) as MockDatabase) } : createSeed()
  } catch {
    // localStorage indisponível (ex.: modo privado) ou JSON corrompido — recomeça do zero
    // em memória, sem quebrar a aplicação.
    cache = createSeed()
  }
  return cache
}

/** Persiste o estado inteiro. Chamado ao final de toda mutação feita por um handler. */
export function writeDb(db: MockDatabase): void {
  cache = db
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // Sem storage disponível: a sessão continua funcionando em memória para a aba atual,
    // só não sobrevive a um refresh — degradação aceitável, não uma falha da aplicação.
  }
}

/** Restaura o cenário conhecido (usado pelo seletor de cenários de mock, fase de rede). */
export function resetDb(): MockDatabase {
  const seed = createSeed()
  writeDb(seed)
  return seed
}

/** Gera um identificador simples e legível para novos registros do mock. */
export function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}
