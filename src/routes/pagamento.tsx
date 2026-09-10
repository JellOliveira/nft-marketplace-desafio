// Pagamento (design-refs/Desktop/Pagamento.png): dados do colecionador, seleção de carteira
// e rede, revisão do pedido e envio. Exige sessão ativa e carrinho não vazio. A cotação é
// revalidada antes do envio — se o carrinho mudar (preço, disponibilidade, cupom) enquanto
// esta tela está aberta, o botão de confirmar é desativado até o usuário revisar de novo
// (item 3 do desafio: "Mudanças devem exigir nova confirmação do usuário").
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import axios from 'axios'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/features/auth/use-session'
import { useCart } from '@/features/cart/use-cart'
import { useCreateOrder, useIdempotencyKey } from '@/features/orders/use-order'
import { cn } from '@/lib/utils'
import { DEFAULT_CATALOG_SEARCH } from '@/types/nft'

type WalletOption = {
  id: string
  label: string
  /** Resultado determinístico da simulação de conexão — não depende de sorteio, para que o
   *  cenário seja reproduzível em teste e na avaliação (item 6 do desafio). */
  connectOutcome: 'connected' | 'rejected'
}

const WALLET_OPTIONS: WalletOption[] = [
  { id: 'metamask', label: 'MetaMask', connectOutcome: 'connected' },
  { id: 'coinbase', label: 'Coinbase Wallet', connectOutcome: 'connected' },
  { id: 'walletconnect-indisponivel', label: 'WalletConnect (indisponível agora)', connectOutcome: 'rejected' },
]

const NETWORKS = [
  { id: 'ethereum', label: 'Ethereum' },
  { id: 'polygon', label: 'Polygon' },
  { id: 'solana', label: 'Solana' },
]

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'rejected'

export const Route = createFileRoute('/pagamento')({
  component: PaymentPage,
})

function PaymentPage() {
  const { user, isAuthenticated, isLoading: isSessionLoading } = useSession()
  const { data: cart, isLoading: isCartLoading } = useCart()
  const navigate = useNavigate()

  // Checkout exige sessão — sem ela, manda para o login preservando o caminho de volta
  // (item 3 do desafio: "retorno ao fluxo anterior").
  useEffect(() => {
    if (!isSessionLoading && !isAuthenticated) {
      navigate({ to: '/login', search: { redirect: '/pagamento' } })
    }
  }, [isSessionLoading, isAuthenticated, navigate])

  if (isSessionLoading || isCartLoading) {
    return (
      <main className="mx-auto max-w-[1200px] px-5 py-10 lg:px-[120px]">
        <Skeleton className="h-96 w-full rounded-xl" />
      </main>
    )
  }

  if (!isAuthenticated) return null

  if (!cart || cart.lines.length === 0) {
    return (
      <main className="mx-auto max-w-[1200px] px-5 py-20 text-center lg:px-[120px]">
        <h1 className="text-xl font-bold text-brand-text">Seu carrinho está vazio</h1>
        <p className="mt-2 text-brand-muted">Adicione um NFT antes de ir para o pagamento.</p>
        <Link
          to="/"
          search={DEFAULT_CATALOG_SEARCH}
          className="mt-6 inline-block rounded-md bg-brand-accent-alt px-4 py-2 text-sm font-medium text-brand-card"
        >
          Ver catálogo
        </Link>
      </main>
    )
  }

  return <PaymentForm collectorName={user!.name} collectorEmail={user!.email} />
}

function PaymentForm({ collectorName, collectorEmail }: { collectorName: string; collectorEmail: string }) {
  const navigate = useNavigate()
  const { data: cart } = useCart()
  const createOrder = useCreateOrder()
  const idempotencyKey = useIdempotencyKey()

  const [displayName, setDisplayName] = useState(collectorName)
  const [email, setEmail] = useState(collectorEmail)
  const [network, setNetwork] = useState(NETWORKS[0].id)
  const [walletId, setWalletId] = useState<string | null>(null)
  const [connection, setConnection] = useState<ConnectionState>('idle')
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [simulateRefusal, setSimulateRefusal] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Cotação "aceita" pelo colecionador no momento em que a revisão começou. Se o carrinho
  // mudar de versão depois disso (evento de tempo real, outra aba, etc.), o envio é
  // bloqueado até o usuário reconhecer explicitamente os novos valores. Sincronizado por
  // efeito, de propósito: o carrinho é um estado que vem de fora do React (a API, via
  // TanStack Query), e este componente precisa "capturar" o primeiro valor real assim que
  // ele chegar — exatamente o caso de uso que `useEffect` existe para resolver. Inicializar
  // direto com `useState(cart?.quoteVersion)` pareceria funcionar na maioria das vezes (o
  // carrinho às vezes já está em cache), mas falha sempre que esta tela é a primeira a
  // buscar o carrinho: o valor inicial ficaria congelado em `undefined` para sempre,
  // travando o botão de confirmar permanentemente.
  const [acknowledgedQuoteVersion, setAcknowledgedQuoteVersion] = useState<number | undefined>(
    undefined,
  )
  useEffect(() => {
    if (cart && acknowledgedQuoteVersion === undefined) {
      setAcknowledgedQuoteVersion(cart.quoteVersion)
    }
  }, [cart, acknowledgedQuoteVersion])
  const quoteIsStale = cart != null && cart.quoteVersion !== acknowledgedQuoteVersion

  function handleConnect(option: WalletOption) {
    setWalletId(option.id)
    setConnection('connecting')
    setWalletAddress(null)
    window.setTimeout(() => {
      if (option.connectOutcome === 'connected') {
        setConnection('connected')
        setWalletAddress(`0x${crypto.randomUUID().replace(/-/g, '').slice(0, 40)}`)
      } else {
        setConnection('rejected')
      }
    }, 700)
  }

  function handleDisconnect() {
    setConnection('idle')
    setWalletAddress(null)
    setWalletId(null)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitError(null)
    if (connection !== 'connected' || !walletAddress || !walletId) return

    createOrder.mutate(
      {
        idempotencyKey,
        payload: {
          walletAddress,
          walletType: walletId,
          network,
          collectorName: displayName,
          collectorEmail: email,
          simulateRefusal,
        },
      },
      {
        onSuccess: (order) => navigate({ to: '/pedido/$orderId', params: { orderId: order.id } }),
        onError: (error) => {
          const message = axios.isAxiosError(error)
            ? (error.response?.data as { message?: string } | undefined)?.message
            : null
          setSubmitError(message ?? 'Não foi possível enviar o pedido agora. Tente novamente.')
        },
      },
    )
  }

  const canSubmit = connection === 'connected' && !quoteIsStale && !createOrder.isPending

  return (
    <main className="mx-auto max-w-[1200px] px-5 py-10 lg:px-[120px]">
      <nav aria-label="Trilha de navegação" className="mb-6 text-sm text-brand-muted">
        <Link to="/" search={DEFAULT_CATALOG_SEARCH} className="hover:text-brand-text">
          Início
        </Link>
        <span className="mx-2">/</span>
        <span>Pagamento</span>
      </nav>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
        <section>
          <h1 className="mb-4 text-lg font-bold text-brand-text">Perfil do colecionador</h1>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nome de exibição" required>
              <input
                required
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="E-mail" required>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <h2 className="mt-8 mb-4 text-lg font-bold text-brand-text">Carteira e rede</h2>
          <Field label="Rede" required>
            <select
              value={network}
              onChange={(event) => setNetwork(event.target.value)}
              className={inputClass}
            >
              {NETWORKS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="mt-4 flex flex-col gap-2" role="radiogroup" aria-label="Carteira">
            {WALLET_OPTIONS.map((option) => (
              <label
                key={option.id}
                className={cn(
                  'flex cursor-pointer items-center justify-between rounded-md border px-4 py-3 text-sm text-brand-text',
                  walletId === option.id ? 'border-brand-accent-alt' : 'border-brand-border',
                )}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="wallet"
                    checked={walletId === option.id}
                    onChange={() => handleConnect(option)}
                  />
                  {option.label}
                </span>
                {walletId === option.id && (
                  <ConnectionBadge connection={connection} onDisconnect={handleDisconnect} />
                )}
              </label>
            ))}
          </div>

          <label className="mt-6 flex items-start gap-2 text-sm text-brand-muted">
            <input
              type="checkbox"
              checked={simulateRefusal}
              onChange={(event) => setSimulateRefusal(event.target.checked)}
              className="mt-0.5"
            />
            Simular pagamento recusado (cenário de teste determinístico)
          </label>
        </section>

        <aside className="h-fit rounded-xl bg-brand-card p-6">
          <h2 className="mb-4 text-lg font-bold text-brand-text">Resumo do pedido</h2>
          <ul className="mb-4 flex flex-col gap-3 text-sm">
            {cart?.lines.map((line) => (
              <li key={`${line.nftId}-${line.edition}`} className="flex justify-between text-brand-text">
                <span className="truncate pr-2">
                  {line.name} <span className="text-brand-muted">(x{line.quantity})</span>
                </span>
                <span className="text-brand-gold">
                  {(Number(line.priceEth) * line.quantity).toFixed(2)} ETH
                </span>
              </li>
            ))}
          </ul>

          {quoteIsStale && (
            <div role="alert" className="mb-4 rounded-md border border-brand-warning bg-brand-elevated p-3 text-sm">
              <p className="text-brand-text">
                Os valores do carrinho mudaram desde que você abriu esta tela.
              </p>
              <button
                type="button"
                onClick={() => setAcknowledgedQuoteVersion(cart?.quoteVersion)}
                className="mt-2 font-bold text-brand-accent-alt"
              >
                Revisar e continuar
              </button>
            </div>
          )}

          <dl className="flex flex-col gap-2 border-t border-brand-border pt-4 text-sm">
            <SummaryRow label="Subtotal" value={`${cart?.subtotalEth} ETH`} />
            <SummaryRow label="Desconto" value={`(-) ${cart?.discountEth} ETH`} />
            <SummaryRow label="Taxa de rede" value={`${cart?.networkFeeEth} ETH`} />
          </dl>
          <div className="mt-4 flex items-center justify-between border-t border-brand-border pt-4">
            <span className="font-bold text-brand-text">Total</span>
            <span className="text-lg font-bold text-brand-gold">{cart?.totalEth} ETH</span>
          </div>

          {submitError && (
            <p role="alert" className="mt-4 text-sm text-brand-error">
              {submitError}
            </p>
          )}

          <Button
            type="submit"
            disabled={!canSubmit}
            className="mt-6 w-full bg-brand-accent-alt text-brand-card hover:bg-brand-accent"
          >
            {createOrder.isPending ? 'Enviando pedido…' : 'Confirmar compra'}
          </Button>
          {connection !== 'connected' && (
            <p className="mt-2 text-center text-xs text-brand-muted">
              Conecte uma carteira para continuar.
            </p>
          )}
        </aside>
      </form>
    </main>
  )
}

const inputClass =
  'h-10 w-full rounded-md border border-brand-border bg-transparent px-3 text-sm text-brand-text focus-visible:border-brand-border-focus focus-visible:outline-none'

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-brand-text">
        {label}
        {required && <span className="text-brand-accent-alt"> *</span>}
      </span>
      {children}
    </label>
  )
}

function SummaryRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-brand-muted">{label}</dt>
      <dd className="text-brand-text">{value}</dd>
    </div>
  )
}

function ConnectionBadge({
  connection,
  onDisconnect,
}: {
  connection: ConnectionState
  onDisconnect: () => void
}) {
  if (connection === 'connecting') {
    return <span className="text-xs text-brand-muted">Conectando…</span>
  }
  if (connection === 'connected') {
    return (
      <button
        type="button"
        onClick={onDisconnect}
        className="text-xs font-bold text-brand-success hover:text-brand-error"
      >
        Conectada · Desconectar
      </button>
    )
  }
  if (connection === 'rejected') {
    return <span className="text-xs text-brand-error">Conexão recusada</span>
  }
  return null
}
