// Perfil do colecionador (design-refs/Desktop/Perfil do Colecionador.png): edição dos
// dados, avatar e alteração de senha. Alterações confirmadas permanecem após refresh (item 3
// do desafio) porque são sempre lidas de volta da API — nunca de um estado local otimista.
import { createFileRoute } from '@tanstack/react-router'
import axios from 'axios'
import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
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
    <div className="space-y-10">
      <ProfileForm
        key={profile.id}
        displayName={profile.displayName}
        username={profile.username}
        email={profile.email}
        ensName={profile.ensName ?? ''}
        avatarUrl={profile.avatarUrl}
      />
      <PasswordForm />
    </div>
  )
}

function ProfileForm({
  displayName: initialDisplayName,
  username: initialUsername,
  email: initialEmail,
  ensName: initialEnsName,
  avatarUrl,
}: {
  displayName: string
  username: string
  email: string
  ensName: string
  avatarUrl: string | null
}) {
  const updateProfile = useUpdateProfile()
  const uploadAvatar = useUploadAvatar()
  const removeAvatar = useRemoveAvatar()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [username, setUsername] = useState(initialUsername)
  const [email, setEmail] = useState(initialEmail)
  const [ensName, setEnsName] = useState(initialEnsName)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFieldErrors({})
    setSavedMessage(null)
    updateProfile.mutate(
      { displayName, username, email, ensName: ensName || null },
      {
        onSuccess: () => setSavedMessage('Dados salvos com sucesso.'),
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
        <Field label="Nome ENS">
          <input
            value={ensName}
            onChange={(event) => setEnsName(event.target.value)}
            placeholder="apelido.eth"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="mt-6">
        <span className="mb-2 block text-sm text-brand-text">Avatar</span>
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

      {savedMessage && <p className="mt-4 text-sm text-brand-success">{savedMessage}</p>}

      <Button
        type="submit"
        disabled={updateProfile.isPending}
        className="mt-6 bg-brand-accent-alt text-brand-card hover:bg-brand-accent"
      >
        {updateProfile.isPending ? 'Salvando…' : 'Salvar'}
      </Button>
    </form>
  )
}

function PasswordForm() {
  const changePassword = useChangePassword()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFieldErrors({})
    setSuccessMessage(null)

    if (newPassword !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'As senhas não conferem.' })
      return
    }

    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setSuccessMessage('Senha alterada com sucesso.')
          setCurrentPassword('')
          setNewPassword('')
          setConfirmPassword('')
        },
        onError: (error) => setFieldErrors(parseError(error).fieldErrors ?? {}),
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-md border-t border-brand-border pt-8">
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

      {successMessage && <p className="mt-4 text-sm text-brand-success">{successMessage}</p>}

      <Button
        type="submit"
        disabled={changePassword.isPending || !currentPassword || !newPassword}
        className="mt-6 bg-brand-accent-alt text-brand-card hover:bg-brand-accent"
      >
        {changePassword.isPending ? 'Salvando…' : 'Salvar'}
      </Button>
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
