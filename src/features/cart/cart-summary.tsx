// Peças do resumo do carrinho reaproveitadas tanto em /carrinho (design-refs/Código do
// Carrinho do NFT.html) quanto em /pagamento (design-refs/Código do Pagamento.html) — os dois
// mostram exatamente os mesmos valores (subtotal, desconto, taxa de rede, total), sempre os
// que a API devolveu, nunca recalculados no cliente (item 3 do desafio). Extraído para um só
// lugar depois que a versão de /pagamento passou a precisar do mesmo cupom e dos mesmos
// totais que já existiam em /carrinho — evita duas implementações divergindo com o tempo.
import axios from 'axios'
import { useState, type FormEvent } from 'react'
import { useApplyCoupon, useRemoveCoupon } from './use-cart'
import { cn } from '@/lib/utils'
import type { ApiErrorBody } from '@/types/auth'

/** Caixa de cupom com duas variantes de entrada, mesmo comportamento por trás:
 *  - "inline": campo sempre visível (como em /carrinho).
 *  - "toggle": só o convite de texto ("Tem um código promocional? Aplique aqui"), que abre o
 *    mesmo campo ao ser clicado (como em /pagamento). */
export function CouponBox({
  couponCode,
  variant = 'inline',
}: {
  couponCode: string | null
  variant?: 'inline' | 'toggle'
}) {
  const applyCoupon = useApplyCoupon()
  const removeCoupon = useRemoveCoupon()
  const [expanded, setExpanded] = useState(variant === 'inline')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleApply(event: FormEvent) {
    event.preventDefault()
    setError(null)
    applyCoupon.mutate(code, {
      onSuccess: () => setCode(''),
      onError: (mutationError) => {
        const message = axios.isAxiosError(mutationError)
          ? (mutationError.response?.data as ApiErrorBody | undefined)?.message
          : null
        setError(message ?? 'Não foi possível aplicar o cupom.')
      },
    })
  }

  if (couponCode) {
    return (
      <div className="mb-4 flex items-center justify-between rounded-md border border-brand-border-focus bg-brand-elevated px-3 py-2 text-sm">
        <span className="text-brand-text">Cupom {couponCode} aplicado</span>
        <button
          type="button"
          onClick={() => removeCoupon.mutate(undefined)}
          className="text-brand-muted hover:text-brand-error"
        >
          Remover
        </button>
      </div>
    )
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mb-4 block w-full text-center text-sm text-brand-text underline decoration-brand-muted underline-offset-2 hover:text-brand-accent"
      >
        Tem um código promocional? Aplique aqui
      </button>
    )
  }

  return (
    <form onSubmit={handleApply} className="mb-4">
      {variant === 'inline' && (
        <label htmlFor="coupon-code" className="mb-2 block text-sm font-bold text-brand-text">
          Código promocional
        </label>
      )}
      <div className="flex h-10 items-center overflow-hidden rounded-sm border border-brand-accent">
        <input
          id="coupon-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Digite o código promocional…"
          className="h-full min-w-0 flex-1 bg-transparent pl-2 text-xs text-brand-text placeholder:text-brand-muted focus-visible:outline-none"
        />
        <button
          type="submit"
          disabled={!code || applyCoupon.isPending}
          className={cn(
            'h-full shrink-0 px-4 text-base font-bold text-brand-card disabled:opacity-50',
            // /pagamento (design-refs/Código do Pagamento.html) usa o dourado mais escuro
            // (#D28A4C) nos botões de ação; /carrinho usa o tom mais claro (#E89B55) — cada
            // um reaproveita a cor que já usa no próprio botão "Confirmar"/"finalizar".
            variant === 'toggle' ? 'bg-brand-accent-alt hover:bg-brand-accent' : 'bg-brand-accent',
          )}
        >
          Aplicar
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-brand-error">
          {error}
        </p>
      )}
    </form>
  )
}

export function CartTotals({
  subtotal,
  discount,
  networkFee,
  total,
  /** /pagamento (design-refs/Código do Pagamento.html) mostra uma linha entre "Taxa
   *  estimada" e o Total; /carrinho não tem essa linha ali — cada tela replica o próprio
   *  design de referência. */
  totalDivider = false,
  estimatedFeeAlign = 'left',
}: {
  subtotal?: string
  discount?: string
  networkFee?: string
  total?: string
  totalDivider?: boolean
  estimatedFeeAlign?: 'left' | 'center'
}) {
  return (
    <>
      <dl className="flex flex-col gap-2 text-sm">
        <SummaryRow label="Subtotal" value={subtotal ? `${subtotal} ETH` : undefined} />
        <SummaryRow
          label="Desconto do lançamento"
          value={discount != null ? (Number(discount) > 0 ? `(-) ${discount} ETH` : '(-) 00.00') : undefined}
        />
        <SummaryRow label="Taxa de rede" value={networkFee ? `${networkFee} ETH` : undefined} />
      </dl>
      <p className={cn('mt-1 text-xs text-brand-accent', estimatedFeeAlign === 'center' && 'text-center')}>
        Taxa estimada
      </p>
      <div className={cn('mt-3', totalDivider && 'border-t border-brand-border pt-4')}>
        <div className="flex items-center justify-between">
          <span className="font-bold text-brand-text">Total</span>
          <span className="text-lg font-bold text-brand-accent">{total ? `${total} ETH` : '—'}</span>
        </div>
      </div>
    </>
  )
}

function SummaryRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-brand-text">{label}</dt>
      <dd className="text-brand-text">{value ?? '—'}</dd>
    </div>
  )
}
