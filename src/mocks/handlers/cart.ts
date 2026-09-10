// Handlers REST do carrinho e da cotação (item 5 do desafio). O carrinho guarda só
// referência a NFT/edição/quantidade — preço e disponibilidade são sempre lidos do catálogo
// atual (NFT_CATALOG) no momento da consulta, nunca congelados na linha do carrinho. É
// assim que uma alteração de preço/disponibilidade via evento de tempo real (fase 6) se
// reflete automaticamente no resumo do carrinho sem precisar de nenhuma sincronização extra.
import { HttpResponse, http } from 'msw'
import type { CartSummary } from '@/types/cart'
import { NFT_CATALOG } from '../data/nfts'
import { findCoupon } from '../data/coupons'
import { readDb, type StoredCart, writeDb } from '../db'
import { simulateNetwork } from '../network'
import { resolveAuthenticatedUser } from './auth'

const NETWORK_FEE_ETH = 0.001

/** Dono do carrinho: o usuário autenticado quando há sessão válida, senão o id de visitante
 *  enviado no header (ver src/lib/guest-id.ts). Nunca uma chave global — é isso que garante
 *  isolamento de carrinho entre usuários diferentes na mesma máquina/navegador. */
function resolveCartOwnerKey(request: Request): string {
  const user = resolveAuthenticatedUser(request)
  if (user) return user.id
  return request.headers.get('x-guest-id') ?? 'anonymous'
}

function getOrCreateCart(db: ReturnType<typeof readDb>, ownerKey: string): StoredCart {
  if (!db.carts[ownerKey]) {
    db.carts[ownerKey] = { lines: [], couponCode: null, quoteVersion: 1 }
  }
  return db.carts[ownerKey]
}

function buildSummary(cart: StoredCart): CartSummary {
  const lines = cart.lines
    .map((line) => {
      const nft = NFT_CATALOG.find((candidate) => candidate.id === line.nftId)
      if (!nft) return null
      return {
        nftId: nft.id,
        name: nft.name,
        imageUrl: nft.imageUrl,
        edition: line.edition,
        priceEth: nft.priceEth,
        quantity: line.quantity,
        availableQuantity: nft.availableQuantity,
      }
    })
    .filter((line): line is NonNullable<typeof line> => line !== null)

  const subtotal = lines.reduce((sum, line) => sum + Number(line.priceEth) * line.quantity, 0)

  const coupon = cart.couponCode ? findCoupon(cart.couponCode) : undefined
  const discountPercent = coupon && !coupon.expired ? coupon.discountPercent : 0
  const discount = subtotal * (discountPercent / 100)
  const networkFee = lines.length > 0 ? NETWORK_FEE_ETH : 0
  const total = Math.max(0, subtotal - discount) + networkFee

  return {
    lines,
    coupon: discountPercent > 0 ? { code: cart.couponCode!, discountPercent } : null,
    subtotalEth: subtotal.toFixed(4),
    discountEth: discount.toFixed(4),
    networkFeeEth: networkFee.toFixed(4),
    totalEth: total.toFixed(4),
    quoteVersion: cart.quoteVersion,
  }
}

export const cartHandlers = [
  http.get('/api/cart', async ({ request }) => {
    await simulateNetwork()
    const db = readDb()
    const cart = getOrCreateCart(db, resolveCartOwnerKey(request))
    return HttpResponse.json(buildSummary(cart))
  }),

  http.post('/api/cart/items', async ({ request }) => {
    await simulateNetwork()
    const payload = (await request.json()) as { nftId: string; edition: string; quantity: number }
    const nft = NFT_CATALOG.find((candidate) => candidate.id === payload.nftId)
    if (!nft) {
      return HttpResponse.json({ message: 'NFT não encontrado.' }, { status: 404 })
    }

    const db = readDb()
    const cart = getOrCreateCart(db, resolveCartOwnerKey(request))
    const existing = cart.lines.find(
      (line) => line.nftId === payload.nftId && line.edition === payload.edition,
    )
    const nextQuantity = (existing?.quantity ?? 0) + payload.quantity

    if (nextQuantity > nft.availableQuantity) {
      return HttpResponse.json(
        { message: `Apenas ${nft.availableQuantity} unidade(s) disponível(is) para esta edição.` },
        { status: 409 },
      )
    }

    if (existing) {
      existing.quantity = nextQuantity
    } else {
      cart.lines.push({ nftId: payload.nftId, edition: payload.edition, quantity: payload.quantity })
    }
    cart.quoteVersion += 1
    writeDb(db)
    return HttpResponse.json(buildSummary(cart), { status: 201 })
  }),

  http.patch('/api/cart/items/:nftId', async ({ request, params }) => {
    await simulateNetwork()
    const payload = (await request.json()) as { edition: string; quantity: number }
    const nft = NFT_CATALOG.find((candidate) => candidate.id === params.nftId)
    if (!nft) {
      return HttpResponse.json({ message: 'NFT não encontrado.' }, { status: 404 })
    }
    if (payload.quantity > nft.availableQuantity) {
      return HttpResponse.json(
        { message: `Apenas ${nft.availableQuantity} unidade(s) disponível(is) para esta edição.` },
        { status: 409 },
      )
    }

    const db = readDb()
    const cart = getOrCreateCart(db, resolveCartOwnerKey(request))
    if (payload.quantity <= 0) {
      cart.lines = cart.lines.filter(
        (line) => !(line.nftId === params.nftId && line.edition === payload.edition),
      )
    } else {
      const line = cart.lines.find(
        (candidate) => candidate.nftId === params.nftId && candidate.edition === payload.edition,
      )
      if (line) line.quantity = payload.quantity
    }
    cart.quoteVersion += 1
    writeDb(db)
    return HttpResponse.json(buildSummary(cart))
  }),

  http.delete('/api/cart/items/:nftId', async ({ request, params }) => {
    await simulateNetwork()
    const url = new URL(request.url)
    const edition = url.searchParams.get('edition')

    const db = readDb()
    const cart = getOrCreateCart(db, resolveCartOwnerKey(request))
    cart.lines = cart.lines.filter(
      (line) => !(line.nftId === params.nftId && line.edition === edition),
    )
    cart.quoteVersion += 1
    writeDb(db)
    return HttpResponse.json(buildSummary(cart))
  }),

  http.post('/api/cart/coupon', async ({ request }) => {
    await simulateNetwork()
    const payload = (await request.json()) as { code: string }
    const coupon = findCoupon(payload.code)

    if (!coupon) {
      return HttpResponse.json({ message: 'Cupom inválido.' }, { status: 404 })
    }
    if (coupon.expired) {
      return HttpResponse.json({ message: 'Este cupom expirou.' }, { status: 410 })
    }

    const db = readDb()
    const cart = getOrCreateCart(db, resolveCartOwnerKey(request))
    cart.couponCode = coupon.code
    cart.quoteVersion += 1
    writeDb(db)
    return HttpResponse.json(buildSummary(cart))
  }),

  http.delete('/api/cart/coupon', async ({ request }) => {
    await simulateNetwork()
    const db = readDb()
    const cart = getOrCreateCart(db, resolveCartOwnerKey(request))
    cart.couponCode = null
    cart.quoteVersion += 1
    writeDb(db)
    return HttpResponse.json(buildSummary(cart))
  }),
]
