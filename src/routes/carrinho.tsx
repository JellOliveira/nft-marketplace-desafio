// Carrinho de NFTs (design-refs/Desktop/Carrinho de NFTs.png): lista de itens com edição de
// quantidade e remoção, cupom promocional e resumo de valores. Os totais exibidos são
// sempre os que a API retornou — nunca calculados no cliente — para que um evento de tempo
// real que mude preço/disponibilidade durante a navegação seja refletido aqui sem
// divergência (item 3 do desafio).
import { createFileRoute, Link } from '@tanstack/react-router'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useApplyCoupon,
  useCart,
  useRemoveCartItem,
  useRemoveCoupon,
  useUpdateCartItem,
} from '@/features/cart/use-cart'
import type { ApiErrorBody } from '@/types/auth'
import { DEFAULT_CATALOG_SEARCH } from '@/types/nft'

export const Route = createFileRoute('/carrinho')({
  component: CartPage,
})

function CartPage() {
  const { data: cart, isLoading } = useCart()

  return (
    <main className="mx-auto max-w-[1200px] px-5 py-10 lg:px-[120px]">
      <h1 className="mb-6 text-lg font-bold text-brand-text">NFTs</h1>

      {isLoading && <CartSkeleton />}

      {cart && cart.lines.length === 0 && (
        <div className="rounded-xl border border-brand-border p-10 text-center">
          <p className="text-brand-text">Seu carrinho está vazio.</p>
          <Link to="/" search={DEFAULT_CATALOG_SEARCH} className="mt-3 inline-block text-sm text-brand-accent-alt">
            Continuar explorando
          </Link>
        </div>
      )}

      {cart && cart.lines.length > 0 && (
        <div className="flex flex-col gap-8 lg:flex-row">
          <section className="min-w-0 flex-1 overflow-hidden rounded-xl bg-brand-card">
            {cart.lines.map((line) => (
              <CartLineRow key={`${line.nftId}-${line.edition}`} line={line} />
            ))}
          </section>

          <CartSummaryPanel
            subtotal={cart.subtotalEth}
            discount={cart.discountEth}
            networkFee={cart.networkFeeEth}
            total={cart.totalEth}
            couponCode={cart.coupon?.code ?? null}
          />
        </div>
      )}
    </main>
  )
}

function CartSkeleton() {
  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <div className="flex-1 space-y-3">
        {[1, 2, 3].map((key) => (
          <Skeleton key={key} className="h-20 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-xl lg:w-[340px]" />
    </div>
  )
}

function CartLineRow({ line }: { line: NonNullable<ReturnType<typeof useCart>['data']>['lines'][number] }) {
  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveCartItem()
  const lineTotal = (Number(line.priceEth) * line.quantity).toFixed(2)
  const atMax = line.quantity >= line.availableQuantity

  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-brand-border p-4 last:border-b-0">
      <img
        src={line.imageUrl}
        alt=""
        className="size-16 shrink-0 rounded-lg object-cover"
        width={64}
        height={64}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-brand-text">{line.name}</p>
        <p className="text-xs text-brand-muted">Edição: {line.edition}</p>
        {/* Preço unitário: só no desktop, onde já cabe ao lado do total sem apertar o
            layout — no mobile o total (sempre visível, mais abaixo) já é a informação que
            importa para decidir a compra. */}
        <p className="text-xs text-brand-muted sm:hidden">{line.priceEth} ETH cada</p>
      </div>
      <p className="hidden w-20 text-brand-gold sm:block">{line.priceEth} ETH</p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Diminuir quantidade"
          disabled={updateItem.isPending}
          onClick={() =>
            updateItem.mutate({ nftId: line.nftId, edition: line.edition, quantity: line.quantity - 1 })
          }
          className="flex size-7 items-center justify-center rounded-full bg-brand-accent-alt text-brand-card disabled:opacity-50"
        >
          <Minus size={14} />
        </button>
        <span className="w-6 text-center text-brand-text">{line.quantity}</span>
        <button
          type="button"
          aria-label="Aumentar quantidade"
          disabled={updateItem.isPending || atMax}
          title={atMax ? 'Quantidade máxima disponível' : undefined}
          onClick={() =>
            updateItem.mutate({ nftId: line.nftId, edition: line.edition, quantity: line.quantity + 1 })
          }
          className="flex size-7 items-center justify-center rounded-full bg-brand-accent-alt text-brand-card disabled:opacity-50"
        >
          <Plus size={14} />
        </button>
      </div>

      <p data-testid="cart-line-total" className="w-20 text-right font-bold text-brand-gold">
        {lineTotal} ETH
      </p>

      <button
        type="button"
        aria-label={`Remover ${line.name} do carrinho`}
        disabled={removeItem.isPending}
        onClick={() => removeItem.mutate({ nftId: line.nftId, edition: line.edition })}
        className="text-brand-muted hover:text-brand-error"
      >
        <Trash2 size={18} />
      </button>
    </div>
  )
}

function CartSummaryPanel({
  subtotal,
  discount,
  networkFee,
  total,
  couponCode,
}: {
  subtotal: string
  discount: string
  networkFee: string
  total: string
  couponCode: string | null
}) {
  const applyCoupon = useApplyCoupon()
  const removeCoupon = useRemoveCoupon()
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

  return (
    <aside className="w-full shrink-0 rounded-xl bg-brand-card p-6 lg:w-[340px]">
      <h2 className="mb-4 text-lg font-bold text-brand-text">Resumo da carteira</h2>

      {couponCode ? (
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
      ) : (
        <form onSubmit={handleApply} className="mb-4">
          <label htmlFor="coupon-code" className="mb-1 block text-sm font-bold text-brand-text">
            Código promocional
          </label>
          <div className="flex gap-2">
            <input
              id="coupon-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Digite o código promocional…"
              className="h-10 flex-1 rounded-md border border-brand-border bg-transparent px-3 text-sm text-brand-text placeholder:text-brand-muted focus-visible:border-brand-border-focus focus-visible:outline-none"
            />
            <Button
              type="submit"
              disabled={!code || applyCoupon.isPending}
              className="bg-brand-accent-alt text-brand-card hover:bg-brand-accent"
            >
              Aplicar
            </Button>
          </div>
          {error && (
            <p role="alert" className="mt-1 text-xs text-brand-error">
              {error}
            </p>
          )}
        </form>
      )}

      <dl className="flex flex-col gap-2 border-t border-brand-border pt-4 text-sm">
        <SummaryRow label="Subtotal" value={`${subtotal} ETH`} />
        <SummaryRow label="Desconto" value={Number(discount) > 0 ? `(-) ${discount} ETH` : '(-) 0.00'} />
        <SummaryRow label="Taxa de rede" value={`${networkFee} ETH`} />
      </dl>

      <div className="mt-4 flex items-center justify-between border-t border-brand-border pt-4">
        <span className="font-bold text-brand-text">Total</span>
        <span className="text-lg font-bold text-brand-gold">{total} ETH</span>
      </div>

      <Button asChild className="mt-6 w-full bg-brand-accent-alt text-brand-card hover:bg-brand-accent">
        <Link to="/pagamento">Ir para o pagamento</Link>
      </Button>
      <Link to="/" search={DEFAULT_CATALOG_SEARCH} className="mt-3 block text-center text-sm text-brand-accent-alt">
        Continuar explorando
      </Link>
    </aside>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-brand-muted">{label}</dt>
      <dd className="text-brand-text">{value}</dd>
    </div>
  )
}
