// Cupons fixos do cenário de mock — determinísticos, exigidos pelo item 6 do desafio para
// exercitar tanto o caminho de sucesso quanto os de cupom inválido/expirado.
export interface Coupon {
  code: string
  discountPercent: number
  expired: boolean
}

export const COUPONS: Coupon[] = [
  { code: 'KURIO10', discountPercent: 10, expired: false },
  { code: 'BEMVINDO15', discountPercent: 15, expired: false },
  { code: 'EXPIRADO5', discountPercent: 5, expired: true },
]

export function findCoupon(code: string): Coupon | undefined {
  return COUPONS.find((coupon) => coupon.code.toLowerCase() === code.toLowerCase())
}
