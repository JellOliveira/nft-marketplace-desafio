import { http } from '@/lib/http'
import type { CreateOrderPayload, Order } from '@/types/order'

export async function createOrder(idempotencyKey: string, payload: CreateOrderPayload): Promise<Order> {
  const { data } = await http.post<Order>('/orders', payload, {
    headers: { 'Idempotency-Key': idempotencyKey },
  })
  return data
}

export async function fetchOrder(id: string): Promise<Order> {
  const { data } = await http.get<Order>(`/orders/${id}`)
  return data
}
