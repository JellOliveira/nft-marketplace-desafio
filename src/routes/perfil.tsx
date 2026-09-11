// Perfil do colecionador (design-refs/Desktop/Perfil do Colecionador.png): edição dos
// dados, avatar e alteração de senha. Alterações confirmadas permanecem após refresh (item 3
// do desafio) porque são sempre lidas de volta da API — nunca de um estado local otimista.
import { createFileRoute } from '@tanstack/react-router'
import axios from 'axios'
import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { AccountLayout } from '@/features/profile/account-layout'
import {
  useChangePassword,
  useProfile,
  useRemoveAvatar,
  useUpdateProfile,
  useUploadAvatar,
} from '@/features/profile/use-profile'
import type { ApiErrorBody } from '@/types/auth'

export const Route = createFileRoute('/perfil')({
  component: () => (
    <AccountLayout active="perfil">
      <ProfileContent />
    </AccountLayout>
  ),
})

function parseError(error: unknown): ApiErrorBody {
  if (axios.isAxiosError(error) && error.response?.data) {
    return error.response.data as ApiErrorBody
  }
  return { message: 'Não foi possível salvar agora. Tente novamente.' }
}

// Único sufixo de ENS oferecido no Figma ("Nome ENS" + seletor ".eth" ao lado do campo) — o
// seletor existe para fidelidade visual, mesmo com uma opção só; o valor persistido já inclui
// o sufixo (ex.: "apelido.eth"), e é removido de volta ao carregar o campo.
const ENS_SUFFIX = '.eth'

function stripEnsSuffix(ensName: string): string {
  return ensName.endsWith(ENS_SUFFIX) ? ensName.slice(0, -ENS_SUFFIX.length) : ensName
}

function ProfileContent() {
  const { data: profile, isLoading } = useProfile()

  if (isLoading || !profile) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <ProfileForm
      key={profile.id}
      displayName={profile.displayName}
      username={profile.username}
      email={profile.email}
      ensName={profile.ensName ?? ''}
      walletNickname={profile.walletNickname ?? ''}
      avatarUrl={profile.avatarUrl}
    />
  )
}

function ProfileForm({
  displayName: initialDisplayName,
  username: initialUsername,
  email: initialEmail,
  ensName: initialEnsName,
  walletNickname: initialWalletNickname,
  avatarUrl,
}: {
  displayName: string
  username: string
  email: string
  ensName: string
  walletNickname: string
  avatarUrl: string | null
}) {
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const uploadAvatar = useUploadAvatar()
  const removeAvatar = useRemoveAvatar()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [username, setUsername] = useState(initialUsername)
  const [email, setEmail] = useState(initialEmail)
  const [ensName, setEnsName] = useState(stripEnsSuffix(initialEnsName))
  const [walletNickname, setWalletNickname] = useState(initialWalletNickname)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  const isSaving = updateProfile.isPending || changePassword.isPending

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFieldErrors({})
    setSavedMessage(null)

    if (newPassword && newPassword !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'As senhas não conferem.' })
      return
    }

    updateProfile.mutate(
      {
        displayName,
        username,
        email,
        ensName: ensName ? `${ensName}${ENS_SUFFIX}` : null,
        walletNickname: walletNickname || null,
      },
      {
        onSuccess: () => {
          if (!newPassword) {
            setSavedMessage('Dados salvos com sucesso.')
            return
          }
          changePassword.mutate(
            { currentPassword, newPassword },
            {
              onSuccess: () => {
                setSavedMessage('Dados e senha salvos com sucesso.')
                setCurrentPassword('')
                setNewPassword('')
                setConfirmPassword('')
              },
              onError: (error) => setFieldErrors(parseError(error).fieldErrors ?? {}),
            },
          )
        },
        onError: (error) => setFieldErrors(parseError(error).fieldErrors ?? {}),
      },
    )
  }

  function handleAvatarSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        uploadAvatar.mutate(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2 className="mb-6 text-lg font-bold text-brand-text">Perfil do colecionador</h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field label="Nome de exibição" required error={fieldErrors.displayName}>
          <input
            required
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Nome de usuário" required error={fieldErrors.username}>
          <input
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="E-mail" required error={fieldErrors.email}>
          <input
            type="email"
            required
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

        <Field label="Apelido da carteira" required error={fieldErrors.walletNickname}>
          <input
            required
            value={walletNickname}
            onChange={(event) => setWalletNickname(event.target.value)}
            className={inputClass}
          />
        </Field>
        <div>
          <span className="mb-1 block text-sm text-brand-text">Avatar</span>
          <div className="flex items-center gap-3">
            <Avatar className="size-12">
              {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
              <AvatarFallback className="bg-brand-elevated text-brand-text">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarSelect}
              className="hidden"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadAvatar.isPending}
              className="bg-brand-accent-alt text-brand-card hover:bg-brand-accent"
            >
              Alterar
            </Button>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => removeAvatar.mutate()}
                className="text-sm text-brand-muted hover:text-brand-error"
              >
                Remover
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 max-w-md border-t border-brand-border pt-8">
        <h2 className="mb-6 text-lg font-bold text-brand-text">Alterar senha</h2>
        <div className="flex flex-col gap-4">
          <Field label="Senha atual" error={fieldErrors.currentPassword}>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className={inputClass}
              autoComplete="current-password"
            />
          </Field>
          <Field label="Nova senha" error={fieldErrors.newPassword}>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className={inputClass}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirmar nova senha" error={fieldErrors.confirmPassword}>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={inputClass}
              autoComplete="new-password"
            />
          </Field>
        </div>

        {savedMessage && <p className="mt-4 text-sm text-brand-success">{savedMessage}</p>}

        <Button
          type="submit"
          disabled={isSaving}
          className="mt-6 bg-brand-accent-alt text-brand-card hover:bg-brand-accent"
        >
          {isSaving ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}

const inputClass =
  'h-10 w-full rounded-md border border-brand-border bg-transparent px-3 text-sm text-brand-text placeholder:text-brand-muted focus-visible:border-brand-border-focus focus-visible:outline-none'

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
