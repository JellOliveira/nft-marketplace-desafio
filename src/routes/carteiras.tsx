// Carteiras (design-refs/Desktop/Carteiras.png): cadastro e edição de carteiras principal e
// secundária. Usa os mesmos campos e opções de rede/tipo de carteira da tela de pagamento,
// para que uma carteira salva aqui fique disponível para seleção lá (item 3 do desafio:
// "Utilizar as carteiras cadastradas").
import { createFileRoute } from '@tanstack/react-router'
import axios from 'axios'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { AccountLayout } from '@/features/profile/account-layout'
import { useRemoveWallet, useSaveWallet, useWallets } from '@/features/profile/use-profile'
import type { ApiErrorBody } from '@/types/auth'
import type { Wallet, WalletRole } from '@/types/profile'

export const Route = createFileRoute('/carteiras')({
  component: () => (
    <AccountLayout active="carteiras">
      <WalletsContent />
    </AccountLayout>
  ),
})

const NETWORKS = ['Ethereum', 'Polygon', 'Solana']
const WALLET_TYPES = ['MetaMask', 'WalletConnect', 'Coinbase Wallet']

// Único sufixo de ENS oferecido no Figma (ver mesma decisão em src/routes/perfil.tsx).
const ENS_SUFFIX = '.eth'

function stripEnsSuffix(ensName: string): string {
  return ensName.endsWith(ENS_SUFFIX) ? ensName.slice(0, -ENS_SUFFIX.length) : ensName
}

function parseError(error: unknown): ApiErrorBody {
  if (axios.isAxiosError(error) && error.response?.data) {
    return error.response.data as ApiErrorBody
  }
  return { message: 'Não foi possível salvar agora. Tente novamente.' }
}

function WalletsContent() {
  const { data: wallets, isLoading } = useWallets()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <WalletSection role="primary" title="Carteira principal" existing={wallets?.primary} />
      <WalletSection
        role="secondary"
        title="Carteira secundária"
        existing={wallets?.secondary}
        primary={wallets?.primary}
      />
    </div>
  )
}

function WalletSection({
  role,
  title,
  existing,
  primary,
}: {
  role: WalletRole
  title: string
  existing?: Wallet
  /** Só usado pela seção secundária: preenche o formulário quando "Igual à carteira
   *  principal" é marcado (design-refs/Desktop/Carteiras.png). */
  primary?: Wallet
}) {
  const [editing, setEditing] = useState(role === 'primary' && !existing)
  const [copyFromPrimary, setCopyFromPrimary] = useState(false)
  const saveWallet = useSaveWallet()
  const removeWallet = useRemoveWallet()

  if (existing && !editing) {
    return (
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-text">{title}</h2>
          <div className="flex gap-3 text-sm">
            <button type="button" onClick={() => setEditing(true)} className="text-brand-accent-alt">
              Editar
            </button>
            <button
              type="button"
              onClick={() => removeWallet.mutate(role)}
              className="text-brand-muted hover:text-brand-error"
            >
              Remover
            </button>
          </div>
        </div>
        <div className="rounded-xl bg-brand-card p-4 text-sm">
          <p className="font-bold text-brand-text">{existing.nickname}</p>
          <p className="mt-1 text-brand-muted">
            {existing.network} · {existing.walletType}
          </p>
          <p className="mt-1 font-mono text-xs text-brand-muted">{existing.address}</p>
        </div>
      </section>
    )
  }

  // Carteira secundária sem cadastro ainda: não mostra o formulário direto — só o aviso e a
  // opção de copiar a carteira principal (design-refs/Desktop/Carteiras.png: "Você ainda não
  // adicionou uma carteira secundária" + "Igual à carteira principal" + "Adicionar").
  if (role === 'secondary' && !existing && !editing) {
    return (
      <SecondaryWalletEmptyState
        primary={primary}
        onAdd={(useSameAsPrimary) => {
          setCopyFromPrimary(useSameAsPrimary)
          setEditing(true)
        }}
      />
    )
  }

  return (
    <section>
      <h2 className="mb-1 text-lg font-bold text-brand-text">{title}</h2>
      <p className="mb-4 text-sm text-brand-muted">
        Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
      </p>
      <WalletForm
        role={role}
        initial={existing ?? (copyFromPrimary ? primary : undefined)}
        onSaved={() => setEditing(false)}
        onCancel={existing || role === 'secondary' ? () => setEditing(false) : undefined}
        saveWallet={saveWallet}
      />
    </section>
  )
}

function SecondaryWalletEmptyState({
  primary,
  onAdd,
}: {
  primary?: Wallet
  onAdd: (useSameAsPrimary: boolean) => void
}) {
  const [sameAsPrimary, setSameAsPrimary] = useState(false)

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="mb-1 text-lg font-bold text-brand-text">Carteira secundária</h2>
          <p className="text-sm text-brand-muted">Você ainda não adicionou uma carteira secundária.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-brand-text">
          <button
            type="button"
            onClick={() => setSameAsPrimary((value) => !value)}
            disabled={!primary}
            className="flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span
              className={
                sameAsPrimary
                  ? 'flex size-4 items-center justify-center rounded-full border border-brand-accent-alt bg-brand-accent-alt'
                  : 'flex size-4 items-center justify-center rounded-full border border-brand-border'
              }
              aria-hidden="true"
            />
            Igual à carteira principal
          </button>
          <button
            type="button"
            onClick={() => onAdd(sameAsPrimary)}
            className="font-bold text-brand-accent-alt"
          >
            Adicionar
          </button>
        </div>
      </div>
    </section>
  )
}

function WalletForm({
  role,
  initial,
  onSaved,
  onCancel,
  saveWallet,
}: {
  role: WalletRole
  initial?: Wallet
  onSaved: () => void
  onCancel?: () => void
  saveWallet: ReturnType<typeof useSaveWallet>
}) {
  const [displayName, setDisplayName] = useState(initial?.displayName ?? '')
  const [nickname, setNickname] = useState(initial?.nickname ?? '')
  const [network, setNetwork] = useState(initial?.network ?? '')
  const [profileName, setProfileName] = useState(initial?.profileName ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [ensOrSecondary, setEnsOrSecondary] = useState(initial?.ensOrSecondary ?? '')
  const [walletType, setWalletType] = useState(initial?.walletType ?? '')
  const [referralCode, setReferralCode] = useState(initial?.referralCode ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [ensName, setEnsName] = useState(stripEnsSuffix(initial?.ensName ?? ''))
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    // Campos marcados com "*" (design-refs/Desktop/Carteiras.png) bloqueiam o envio se
    // ficarem vazios, com o erro aparecendo na hora — sem esperar a resposta do servidor,
    // que ainda faz a mesma checagem por segurança.
    const requiredErrors: Record<string, string> = {}
    if (!displayName.trim()) requiredErrors.displayName = 'Informe o nome de exibição.'
    if (!nickname.trim()) requiredErrors.nickname = 'Informe um apelido para a carteira.'
    if (!network) requiredErrors.network = 'Selecione uma rede.'
    if (!profileName.trim()) requiredErrors.profileName = 'Informe o nome do perfil.'
    if (!address.trim()) requiredErrors.address = 'Informe o endereço da carteira.'
    if (!walletType) requiredErrors.walletType = 'Selecione o tipo de carteira.'
    if (!referralCode.trim()) requiredErrors.referralCode = 'Informe o código de indicação.'
    if (!email.trim()) requiredErrors.email = 'Informe um e-mail.'
    if (!ensName.trim()) requiredErrors.ensName = 'Informe um nome ENS.'
    if (Object.keys(requiredErrors).length > 0) {
      setFieldErrors(requiredErrors)
      return
    }
    setFieldErrors({})

    saveWallet.mutate(
      {
        role,
        payload: {
          displayName,
          nickname,
          network,
          profileName,
          address,
          ensOrSecondary: ensOrSecondary || null,
          walletType,
          referralCode,
          email,
          ensName: ensName ? `${ensName}${ENS_SUFFIX}` : null,
        },
      },
      {
        onSuccess: onSaved,
        onError: (error) => setFieldErrors(parseError(error).fieldErrors ?? {}),
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field label="Nome de exibição" required error={fieldErrors.displayName}>
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className={inputClass} />
        </Field>
        <Field label="Apelido da carteira" required error={fieldErrors.nickname}>
          <input value={nickname} onChange={(event) => setNickname(event.target.value)} className={inputClass} />
        </Field>

        <Field label="Rede" required error={fieldErrors.network}>
          <Select value={network || undefined} onValueChange={setNetwork}>
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue placeholder="Selecione uma rede" />
            </SelectTrigger>
            <SelectContent>
              {NETWORKS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Nome do perfil" required error={fieldErrors.profileName}>
          <input
            value={profileName}
            onChange={(event) => setProfileName(event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Endereço da carteira" required error={fieldErrors.address}>
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Endereço 0x da carteira"
            className={inputClass}
          />
        </Field>
        <Field label="ENS ou carteira secundária (opcional)">
          <input
            value={ensOrSecondary}
            onChange={(event) => setEnsOrSecondary(event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Tipo de carteira" required error={fieldErrors.walletType}>
          <Select value={walletType || undefined} onValueChange={setWalletType}>
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue placeholder="Selecione uma carteira" />
            </SelectTrigger>
            <SelectContent>
              {WALLET_TYPES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Código de indicação" required error={fieldErrors.referralCode}>
          <input
            value={referralCode}
            onChange={(event) => setReferralCode(event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="E-mail" required error={fieldErrors.email}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Nome ENS" required error={fieldErrors.ensName}>
          <div className="flex gap-2">
            <Select value={ENS_SUFFIX}>
              <SelectTrigger className="!h-10 w-24 shrink-0 justify-between rounded-md border border-brand-border bg-transparent px-3 text-sm text-brand-text focus-visible:border-brand-border-focus focus-visible:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ENS_SUFFIX}>{ENS_SUFFIX}</SelectItem>
              </SelectContent>
            </Select>
            <input
              value={ensName}
              onChange={(event) => setEnsName(event.target.value)}
              placeholder="apelido"
              className={inputClass}
            />
          </div>
        </Field>
      </div>

      <div className="mt-6 flex gap-3">
        <Button
          type="submit"
          disabled={saveWallet.isPending}
          className="bg-brand-accent-alt text-brand-card hover:bg-brand-accent"
        >
          {saveWallet.isPending ? 'Salvando…' : 'Salvar carteira'}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} className="text-brand-text">
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}

const inputClass =
  'h-10 w-full rounded-md border border-brand-border bg-transparent px-3 text-sm text-brand-text placeholder:text-brand-muted focus-visible:border-brand-border-focus focus-visible:outline-none'

const selectTriggerClass =
  '!h-10 w-full justify-between rounded-md border border-brand-border bg-transparent px-3 text-sm text-brand-text [&_[data-placeholder]]:text-brand-muted focus-visible:border-brand-border-focus focus-visible:ring-0'

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-brand-text">
        {label}
        {required && <span className="text-brand-accent-alt"> *</span>}
      </span>
      {children}
      {error && (
        <span role="alert" className="mt-1 block text-xs text-brand-error">
          {error}
        </span>
      )}
    </label>
  )
}
