// Pagamento (design-refs/Desktop/Pagamento.png + design-refs/Código do Pagamento.html): dados
// do colecionador, seleção de carteira e rede, revisão do pedido ("Seus NFTs") e envio. A
// cotação é revalidada antes do envio — se o carrinho mudar (preço, disponibilidade, cupom)
// enquanto esta tela está aberta, o botão de confirmar é desativado até o usuário revisar de
// novo (item 3 do desafio: "Mudanças devem exigir nova confirmação do usuário").
//
// Esta tela NÃO exige sessão para ser exibida: o carrinho já funciona para visitantes (a API
// resolve o dono do carrinho pelo header X-Guest-Id quando não há login — ver
// src/mocks/handlers/cart.ts), então bloquear a tela inteira atrás de /login era o bug
// relatado ("abre login, ao fechar/voltar trava o site até recarregar"): fechar aquele modal
// navegava de volta para /pagamento, que redirecionava para /login de novo, num loop. Só o
// envio do pedido continua exigindo conta — os handlers de pedido não aceitam um dono anônimo
// (item 5 do desafio: sem exposição de dados entre usuários, o pedido precisa de um dono
// real) — então, sem sessão, o botão vira um convite para entrar, e o login acontece num
// cartão sobreposto a esta própria tela (sem navegar para outra rota), fechando sozinho assim
// que autentica.
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import axios from 'axios'
import { ChevronLeft } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { AuthModal } from '@/features/auth/auth-modal'
import { useSession } from '@/features/auth/use-session'
import { CartTotals, CouponBox } from '@/features/cart/cart-summary'
import { useCart } from '@/features/cart/use-cart'
import { useCreateOrder, useIdempotencyKey } from '@/features/orders/use-order'
import { useProfile } from '@/features/profile/use-profile'
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

  if (isSessionLoading || isCartLoading) {
    return (
      <main className="mx-auto max-w-[1200px] px-5 py-10 lg:px-[120px]">
        <Skeleton className="h-96 w-full rounded-xl" />
      </main>
    )
  }

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

  return (
    <PaymentForm
      isAuthenticated={isAuthenticated}
      collectorName={user?.name ?? ''}
      collectorEmail={user?.email ?? ''}
    />
  )
}

function PaymentForm({
  isAuthenticated,
  collectorName,
  collectorEmail,
}: {
  isAuthenticated: boolean
  collectorName: string
  collectorEmail: string
}) {
  const navigate = useNavigate()
  const { data: cart } = useCart()
  const { data: profile } = useProfile()
  const createOrder = useCreateOrder()
  const idempotencyKey = useIdempotencyKey()

  const [displayName, setDisplayName] = useState(collectorName)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState(collectorEmail)
  const [ensName, setEnsName] = useState('')
  const [profileNickname, setProfileNickname] = useState('')
  const [ensOrSecondary, setEnsOrSecondary] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [note, setNote] = useState('')
  const [network, setNetwork] = useState(NETWORKS[0].id)
  const [walletId, setWalletId] = useState<string | null>(null)
  const [connection, setConnection] = useState<ConnectionState>('idle')
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [simulateRefusal, setSimulateRefusal] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [authOverlay, setAuthOverlay] = useState<'login' | 'register' | null>(null)

  // Prefill dos campos de identidade a partir do perfil salvo assim que ele chega — o usuário
  // ainda pode sobrescrever qualquer um deles só para este pedido.
  useEffect(() => {
    if (profile) {
      setUsername((current) => current || profile.username)
      setEnsName((current) => current || profile.ensName || '')
    }
  }, [profile])

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

  const connectedWallet = walletId ? WALLET_OPTIONS.find((option) => option.id === walletId) : undefined

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
    if (!isAuthenticated || connection !== 'connected' || !walletAddress || !walletId) return

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
          // Campos extras do "Perfil do colecionador" desta tela (design-refs/Código do
          // Pagamento.html) — não fazem parte da identidade da conta (isso é /perfil), são só
          // metadados deste pedido específico.
          username,
          ensName: ensName ? `${ensName}.eth` : null,
          profileNickname: profileNickname || null,
          ensOrSecondary: ensOrSecondary || null,
          referralCode: referralCode || null,
          note: note || null,
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

  const canSubmit = isAuthenticated && connection === 'connected' && !quoteIsStale && !createOrder.isPending

  return (
    <main className="mx-auto max-w-[1200px] px-5 py-10 lg:px-[120px]">
      {/* Barra mobile (design-refs/Mobile/Pagamento.png): seta "voltar" + título centralizado
       *  — o header padrão fica escondido nesta tela abaixo de lg. */}
      <div className="relative mb-6 flex items-center justify-center lg:hidden">
        <button
          type="button"
          onClick={() => navigate({ to: '/carrinho' })}
          aria-label="Voltar ao carrinho"
          className="absolute left-0 flex size-9 items-center justify-center rounded-full bg-brand-card text-brand-text"
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-lg font-bold text-brand-text">Pagamento com carteira</h1>
      </div>

      <nav aria-label="Trilha de navegação" className="mb-6 hidden text-sm text-brand-muted lg:block">
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
            <Field label="Nome de usuário" required>
              <input
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Rede" required>
              <Select value={network} onValueChange={setNetwork}>
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue placeholder="Selecione uma rede" />
                </SelectTrigger>
                <SelectContent>
                  {NETWORKS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Nome do perfil" required>
              <input
                required
                value={profileNickname}
                onChange={(event) => setProfileNickname(event.target.value)}
                placeholder="Como esta carteira aparece pra você"
                className={inputClass}
              />
            </Field>

            <Field label="Endereço da carteira" required>
              <input
                readOnly
                disabled
                value={walletAddress ?? ''}
                placeholder="Conecte uma carteira ao lado para preencher"
                className={cn(inputClass, 'text-brand-muted disabled:opacity-70')}
              />
            </Field>
            <Field label="ENS ou carteira secundária (opcional)">
              <input
                value={ensOrSecondary}
                onChange={(event) => setEnsOrSecondary(event.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Tipo de carteira" required>
              <input
                readOnly
                disabled
                value={connectedWallet?.label ?? ''}
                placeholder="Selecione uma carteira ao lado"
                className={cn(inputClass, 'text-brand-muted disabled:opacity-70')}
              />
            </Field>
            <Field label="Código de indicação" required>
              <input
                required
                value={referralCode}
                onChange={(event) => setReferralCode(event.target.value)}
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
            {/* Só seleção, sem texto livre (design-refs/Código do Pagamento.html mostra um
             *  dropdown, não um campo de digitação): escolhe entre os nomes ENS que já
             *  existem — o do perfil e o que foi digitado em "ENS ou carteira secundária" ao
             *  lado — em vez de deixar digitar um nome novo aqui. */}
            <Field label="Nome ENS" required>
              <Select value={ensName || 'none'} onValueChange={(value) => setEnsName(value === 'none' ? '' : value)}>
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue placeholder=".eth" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">.eth</SelectItem>
                  {profile?.ensName && <SelectItem value={profile.ensName}>{profile.ensName}.eth</SelectItem>}
                  {ensOrSecondary && ensOrSecondary !== profile?.ensName && (
                    <SelectItem value={ensOrSecondary}>{ensOrSecondary}.eth</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* "Usar outra carteira?" (design-refs/Código do Pagamento.html): desconecta a
           *  carteira atual para liberar a escolha de uma diferente na lateral — só aparece
           *  depois que alguma já está conectada. */}
          {connection === 'connected' && (
            <button
              type="button"
              onClick={handleDisconnect}
              className="mt-6 flex items-center gap-2 text-sm text-brand-text hover:text-brand-accent-alt"
            >
              <span className="size-3.5 rounded-full border-2 border-brand-accent-alt" aria-hidden="true" />
              Usar outra carteira?
            </button>
          )}

          <label className="mt-4 flex items-start gap-2 text-sm text-brand-muted">
            <input
              type="checkbox"
              checked={simulateRefusal}
              onChange={(event) => setSimulateRefusal(event.target.checked)}
              className="mt-0.5"
            />
            Simular pagamento recusado (cenário de teste determinístico)
          </label>

          <div className="mt-6">
            <span className="mb-2 block text-sm text-brand-text">Observação do colecionador (opcional)</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={5}
              className="w-full resize-y rounded-md border border-brand-border bg-transparent p-3 text-sm text-brand-text focus-visible:border-brand-border-focus focus-visible:outline-none"
            />
          </div>
        </section>

        <aside className="h-fit">
          <h2 className="mb-4 text-lg font-bold text-brand-text">Seus NFTs</h2>
          <div className="mb-3 flex items-center justify-between text-sm font-bold text-brand-text">
            <span>NFTs</span>
            <span>Subtotal</span>
          </div>
          <div className="mb-4 h-px bg-brand-accent-alt/30" aria-hidden="true" />

          {/* Sem moldura ao redor da lista inteira — cada produto tem sua própria, igual em
           *  /carrinho (design-refs/Código do Pagamento.html: "Seus NFTs" fica solto no fundo
           *  da página, só os itens em si têm o card #241612). */}
          <ul className="mb-4 flex flex-col gap-3">
            {cart?.lines.map((line) => (
              <li
                key={`${line.nftId}-${line.edition}`}
                className="flex items-center gap-3 rounded-lg bg-brand-card p-2"
              >
                <img src={line.imageUrl} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-brand-text">{line.name}</p>
                  <p className="text-xs text-brand-muted">ID do token: {line.tokenId}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-brand-muted">(x {line.quantity})</span>
                  <span className="text-sm font-bold text-brand-accent">
                    {(Number(line.priceEth) * line.quantity).toFixed(2)} ETH
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <CouponBox couponCode={cart?.coupon?.code ?? null} variant="toggle" />

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

          <CartTotals
            subtotal={cart?.subtotalEth}
            discount={cart?.discountEth}
            networkFee={cart?.networkFeeEth}
            total={cart?.totalEth}
            totalDivider
            estimatedFeeAlign="center"
          />

          <h2 className="mt-6 mb-3 text-center text-base font-bold text-brand-text">Carteira e rede</h2>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Carteira">
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

          {!isAuthenticated ? (
            <p className="mt-2 text-center text-xs text-brand-muted">
              <button
                type="button"
                onClick={() => setAuthOverlay('login')}
                className="font-bold text-brand-accent-alt hover:underline"
              >
                Entre na sua conta
              </button>{' '}
              para confirmar a compra.
            </p>
          ) : (
            connection !== 'connected' && (
              <p className="mt-2 text-center text-xs text-brand-muted">
                Conecte uma carteira para continuar.
              </p>
            )
          )}
        </aside>
      </form>

      {/* Login/cadastro por cima desta própria tela (sem navegar): fechar (Esc, X, clique
       *  fora ou sucesso) só esconde o cartão e mantém o carrinho e os campos já preenchidos
       *  aqui — é o que corrige o travamento relatado, em que fechar o /login navegava de
       *  volta pra /pagamento e disparava o redirecionamento de novo, num loop. */}
      {authOverlay && (
        <AuthModal
          mode={authOverlay}
          redirectTo="/pagamento"
          onClose={() => setAuthOverlay(null)}
          onModeChange={setAuthOverlay}
          compactMobileLogin
        />
      )}
    </main>
  )
}

const inputClass =
  'h-10 w-full rounded-md border border-brand-border bg-transparent px-3 text-sm text-brand-text focus-visible:border-brand-border-focus focus-visible:outline-none'

const selectTriggerClass =
  '!h-10 w-full justify-between rounded-md border border-brand-border bg-transparent px-3 text-sm text-brand-text data-placeholder:text-brand-muted focus-visible:border-brand-border-focus focus-visible:ring-0'

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
