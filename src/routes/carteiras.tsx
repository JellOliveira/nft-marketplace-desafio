// Carteiras (design-refs/Desktop/Carteiras.png): cadastro e edição de carteiras principal e
// secundária. Usa os mesmos campos e opções de rede/tipo de carteira da tela de pagamento,
// para que uma carteira salva aqui fique disponível para seleção lá (item 3 do desafio:
// "Utilizar as carteiras cadastradas").
import { createFileRoute } from '@tanstack/react-router'
import axios from 'axios'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
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
      <WalletSection role="secondary" title="Carteira secundária" existing={wallets?.secondary} />
    </div>
  )
}

function WalletSection({
  role,
  title,
  existing,
}: {
  role: WalletRole
  title: string
  existing?: Wallet
}) {
  const [editing, setEditing] = useState(!existing)
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

  return (
    <section>
      <h2 className="mb-1 text-lg font-bold text-brand-text">{title}</h2>
      <p className="mb-4 text-sm text-brand-muted">
        Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
      </p>
      <WalletForm
        role={role}
        initial={existing}
        onSaved={() => setEditing(false)}
        onCancel={existing ? () => setEditing(false) : undefined}
        saveWallet={saveWallet}
      />
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
  const [address, setAddress] = useState(initial?.address ?? '')
  const [ensOrSecondary, setEnsOrSecondary] = useState(initial?.ensOrSecondary ?? '')
  const [walletType, setWalletType] = useState(initial?.walletType ?? '')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFieldErrors({})
    saveWallet.mutate(
      {
        role,
        payload: { displayName, nickname, network, address, ensOrSecondary: ensOrSecondary || null, walletType },
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
          <select value={network} onChange={(event) => setNetwork(event.target.value)} className={inputClass}>
            <option value="">Selecione uma rede</option>
            {NETWORKS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tipo de carteira" required error={fieldErrors.walletType}>
          <select value={walletType} onChange={(event) => setWalletType(event.target.value)} className={inputClass}>
            <option value="">Selecione uma carteira</option>
            {WALLET_TYPES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
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
  'h-10 w-full rounded-md border border-brand-border bg-transparent px-3 text-sm text-brand-text focus-visible:border-brand-border-focus focus-visible:outline-none'

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
