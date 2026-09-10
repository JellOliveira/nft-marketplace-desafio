import { http } from '@/lib/http'
import type { CartSummary } from '@/types/cart'

export async function fetchCart(): Promise<CartSummary> {
  const { data } = await http.get<CartSummary>('/cart')
  return data
}

export async function addCartItem(payload: {
  nftId: string
  edition: string
  quantity: number
}): Promise<CartSummary> {
  const { data } = await http.post<CartSummary>('/cart/items', payload)
  return data
}

export async function updateCartItem(payload: {
  nftId: string
  edition: string
  quantity: number
}): Promise<CartSummary> {
  const { data } = await http.patch<CartSummary>(`/cart/items/${payload.nftId}`, {
    edition: payload.edition,
    quantity: payload.quantity,
  })
  return data
}

export async function removeCartItem(payload: { nftId: string; edition: string }): Promise<CartSummary> {
  const { data } = await http.delete<CartSummary>(`/cart/items/${payload.nftId}`, {
    params: { edition: payload.edition },
  })
  return data
}

export async function applyCoupon(code: string): Promise<CartSummary> {
  const { data } = await http.post<CartSummary>('/cart/coupon', { code })
  return data
}

export async function removeCoupon(): Promise<CartSummary> {
  const { data } = await http.delete<CartSummary>('/cart/coupon')
  return data
}
