// Handlers REST de pedidos (item 5 do desafio) — a parte mais sensível de toda a simulação.
// Regras que não podem ser quebradas aqui:
//
// 1. O cliente NUNCA decide que um pedido foi confirmado — só este arquivo decide, e só
//    depois de um tempo simulado de processamento. A tela de confirmação (rota
//    /pedido/$orderId) só aparece quando o `status` retornado por este handler é
//    "confirmed". Isso é o que evita o eliminatório "compra confirmada sem resposta da
//    simulação".
// 2. Criação de pedido é idempotente: a mesma tentativa (mesma Idempotency-Key) sempre
//    devolve o mesmo pedido; reusar a chave com um corpo diferente gera 409.
// 3. Preço, cupom e disponibilidade são revalidados no momento da criação — não confiamos
//    no que o carrinho tinha "achado" antes.
// 4. O carrinho só perde os itens comprados depois que o pedido é efetivamente confirmado,
//    nunca na criação (que ainda está pendente) nem numa recusa.
import { HttpResponse, http } from 'msw'
import { findCoupon } from '../data/coupons'
import { getEffectiveNft } from '../nft-overrides'
import { generateId, readDb, type StoredOrder, writeDb } from '../db'
import { simulateNetwork } from '../network'
import { resolveAuthenticatedUser } from './auth'

const NETWORK_FEE_ETH = 0.001
/** Tempo simulado de processamento antes de um pedido saudável virar "confirmed". */
const CONFIRM_AFTER_MS = 3000
/** Pedidos marcados para o cenário de recusa terminam mais rápido, imitando uma recusa
 *  precoce de carteira/rede (mais realista que esperar o mesmo tempo de um sucesso). */
const REFUSE_AFTER_MS = 1800

function toPublicOrder(order: StoredOrder) {
  return {
    id: order.id,
    status: order.status,
    createdAt: new Date(order.createdAt).toISOString(),
    version: order.version,
    lines: order.lines,
    subtotalEth: order.subtotalEth,
    discountEth: order.discountEth,
    networkFeeEth: order.networkFeeEth,
    totalEth: order.totalEth,
    couponCode: order.couponCode,
    walletAddress: order.walletAddress,
    walletType: order.walletType,
    network: order.network,
    // O hash da transação só existe depois de confirmado — antes disso a transação
    // simplesmente não aconteceu ainda.
    transactionHash: order.status === 'confirmed' ? order.transactionHash : null,
  }
}

function resolveOwnerKey(request: Request): string | null {
  const user = resolveAuthenticatedUser(request)
  return user?.id ?? null
}

/** Hash simples e determinístico do corpo relevante da requisição — usado só para detectar
 *  reuso de Idempotency-Key com conteúdo diferente, não para segurança. */
function hashPayload(value: unknown): string {
  const json = JSON.stringify(value)
  let hash = 0
  for (let i = 0; i < json.length; i++) {
    hash = (hash << 5) - hash + json.charCodeAt(i)
    hash |= 0
  }
  return String(hash)
}

/** Resolve (e persiste, se mudou) o estado atual de um pedido pendente com base no tempo
 *  decorrido desde a criação. Chamado sempre que o pedido é lido — é assim que tanto o
 *  polling REST quanto, na fase 6, o evento Socket.IO enxergam a mesma transição. */
function resolveOrderStatus(db: ReturnType<typeof readDb>, order: StoredOrder): StoredOrder {
  if (order.status !== 'pending') return order

  const elapsed = Date.now() - order.createdAt
  const threshold = order.simulateRefusal ? REFUSE_AFTER_MS : CONFIRM_AFTER_MS
  if (elapsed < threshold) return order

  order.status = order.simulateRefusal ? 'refused' : 'confirmed'
  order.version += 1

  if (order.status === 'confirmed' && !order.cartCleared) {
    const cart = db.carts[order.ownerKey]
    if (cart) {
      for (const purchased of order.lines) {
        const line = cart.lines.find(
          (candidate) => candidate.nftId === purchased.nftId && candidate.edition === purchased.edition,
        )
        if (line) {
          // Remove só a quantidade efetivamente comprada — se o usuário aumentou a
          // quantidade no carrinho depois de já ter enviado este pedido, o excedente
          // permanece (item 3 do desafio: remover "apenas os itens e quantidades
          // compradas").
          line.quantity -= purchased.quantity
          if (line.quantity <= 0) {
            cart.lines = cart.lines.filter((candidate) => candidate !== line)
          }
        }
      }
      cart.quoteVersion += 1
    }
    order.cartCleared = true
  }

  writeDb(db)
  return order
}

export const orderHandlers = [
  http.post('/api/orders', async ({ request }) => {
    const netOutcome = await simulateNetwork()
    if (netOutcome.kind === 'error') return netOutcome.response

    const ownerKey = resolveOwnerKey(request)
    if (!ownerKey) {
      return HttpResponse.json({ message: 'Sessão inválida ou expirada.' }, { status: 401 })
    }

    const idempotencyKey = request.headers.get('idempotency-key')
    if (!idempotencyKey) {
      return HttpResponse.json({ message: 'Idempotency-Key é obrigatório.' }, { status: 400 })
    }

    const payload = (await request.json()) as {
      walletAddress: string
      walletType: string
      network: string
      collectorName: string
      collectorEmail: string
      simulateRefusal: boolean
      username?: string
      ensName?: string | null
      profileNickname?: string | null
      ensOrSecondary?: string | null
      referralCode?: string | null
      note?: string | null
    }

    const db = readDb()
    const cart = db.carts[ownerKey]
    if (!cart || cart.lines.length === 0) {
      return HttpResponse.json({ message: 'Seu carrinho está vazio.' }, { status: 422 })
    }

    const requestHash = hashPayload({ payload, cartLines: cart.lines, coupon: cart.couponCode })
    const idempotencyRecordKey = `${ownerKey}:${idempotencyKey}`
    const existing = db.idempotency[idempotencyRecordKey]

    if (existing) {
      if (existing.requestHash !== requestHash) {
        return HttpResponse.json(
          { message: 'Esta chave de idempotência já foi usada com um pedido diferente.' },
          { status: 409 },
        )
      }
      // Mesma tentativa reenviada (clique duplo, timeout seguido de retry): devolve
      // exatamente o mesmo pedido, sem criar um segundo.
      const order = resolveOrderStatus(db, db.orders[existing.orderId])
      return HttpResponse.json(toPublicOrder(order), { status: 200 })
    }

    // Revalida preço e disponibilidade no catálogo atual — não confia no que o carrinho
    // "achava" antes (item 3 e item 7 do desafio: cotação desatualizada não pode fechar
    // pedido).
    const lines: StoredOrder['lines'] = []
    for (const cartLine of cart.lines) {
      const nft = getEffectiveNft(cartLine.nftId)
      if (!nft) continue
      if (cartLine.quantity > nft.availableQuantity) {
        return HttpResponse.json(
          {
            message: `A disponibilidade de "${nft.name}" mudou. Revise seu carrinho antes de continuar.`,
          },
          { status: 409 },
        )
      }
      lines.push({
        nftId: nft.id,
        name: nft.name,
        imageUrl: nft.imageUrl,
        edition: cartLine.edition,
        quantity: cartLine.quantity,
        priceEth: nft.priceEth,
      })
    }

    if (lines.length === 0) {
      return HttpResponse.json({ message: 'Nenhum item do carrinho está mais disponível.' }, { status: 409 })
    }

    const subtotal = lines.reduce((sum, line) => sum + Number(line.priceEth) * line.quantity, 0)
    const coupon = cart.couponCode ? findCoupon(cart.couponCode) : undefined
    const discountPercent = coupon && !coupon.expired ? coupon.discountPercent : 0
    const discount = subtotal * (discountPercent / 100)
    const networkFee = NETWORK_FEE_ETH
    const total = Math.max(0, subtotal - discount) + networkFee

    const order: StoredOrder = {
      id: generateId('order'),
      ownerKey,
      status: 'pending',
      createdAt: Date.now(),
      version: 1,
      lines,
      subtotalEth: subtotal.toFixed(4),
      discountEth: discount.toFixed(4),
      networkFeeEth: networkFee.toFixed(4),
      totalEth: total.toFixed(4),
      couponCode: discountPercent > 0 ? cart.couponCode : null,
      walletAddress: payload.walletAddress,
      walletType: payload.walletType,
      network: payload.network,
      transactionHash: `0x${generateId('tx').slice(3)}${Math.random().toString(16).slice(2, 10)}`,
      simulateRefusal: Boolean(payload.simulateRefusal),
      cartCleared: false,
    }

    db.orders[order.id] = order
    db.idempotency[idempotencyRecordKey] = { orderId: order.id, requestHash }
    writeDb(db)

    // Pede ao servidor de tempo real para ecoar de volta, mais tarde, o resultado que este
    // handler já sabe que vai acontecer — é assim que `order.updated` chega por um
    // socket.io-client de verdade (fase 6), em vez de a UI só confiar no polling REST. Se o
    // socket não estiver conectado (ex.: servidor de tempo real fora do ar), a chamada é
    // ignorada silenciosamente — o polling em useOrder continua funcionando como caminho
    // principal de qualquer forma.
    void import('@/lib/socket').then(({ socket }) => {
      socket.emit('order:watch', {
        orderId: order.id,
        status: order.simulateRefusal ? 'refused' : 'confirmed',
        version: order.version + 1,
        delayMs: order.simulateRefusal ? REFUSE_AFTER_MS : CONFIRM_AFTER_MS,
      })
    })

    return HttpResponse.json(toPublicOrder(order), { status: 201 })
  }),

  http.get('/api/orders/:id', async ({ request, params }) => {
    const netOutcome = await simulateNetwork()
    if (netOutcome.kind === 'error') return netOutcome.response
    const ownerKey = resolveOwnerKey(request)
    if (!ownerKey) {
      return HttpResponse.json({ message: 'Sessão inválida ou expirada.' }, { status: 401 })
    }

    const db = readDb()
    const stored = db.orders[params.id as string]
    // Nunca revela se o pedido existe e pertence a outra pessoa — mesma resposta de "não
    // encontrado" nos dois casos (item 5 do desafio: sem exposição de dados entre usuários).
    if (!stored || stored.ownerKey !== ownerKey) {
      return HttpResponse.json({ message: 'Pedido não encontrado.' }, { status: 404 })
    }

    const order = resolveOrderStatus(db, stored)
    return HttpResponse.json(toPublicOrder(order))
  }),
]
