// Hooks de perfil, avatar, senha e carteiras. Todas as mutations invalidam tanto a query de
// perfil/carteiras quanto a de sessão — o nome exibido no header (que vem de `useSession`)
// precisa refletir uma alteração de "Nome de exibição" imediatamente, sem esperar um reload.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authKeys } from '@/features/auth/query-keys'
import { useSession } from '@/features/auth/use-session'
import type { PasswordChangePayload, ProfileUpdatePayload, WalletPayload, WalletRole } from '@/types/profile'
import {
  changePassword,
  fetchProfile,
  fetchWallets,
  removeAvatar,
  removeWallet,
  saveWallet,
  updateProfile,
  uploadAvatar,
} from './api'

function profileKey(userId: string | undefined) {
  return ['profile', userId] as const
}

function walletsKey(userId: string | undefined) {
  return ['wallets', userId] as const
}

export function useProfile() {
  const { user } = useSession()
  return useQuery({
    queryKey: profileKey(user?.id),
    queryFn: fetchProfile,
    enabled: Boolean(user),
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const { user } = useSession()

  return useMutation({
    mutationFn: (payload: ProfileUpdatePayload) => updateProfile(payload),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKey(user?.id), profile)
      // O header lê o nome via a query de sessão — atualiza os dois em conjunto, sem exigir
      // um refetch redondo.
      queryClient.setQueryData(authKeys.session, (previous: typeof user) =>
        previous ? { ...previous, name: profile.displayName, email: profile.email } : previous,
      )
    },
  })
}

export function useUploadAvatar() {
  const queryClient = useQueryClient()
  const { user } = useSession()

  return useMutation({
    mutationFn: (dataUrl: string) => uploadAvatar(dataUrl),
    onSuccess: (profile) => queryClient.setQueryData(profileKey(user?.id), profile),
  })
}

export function useRemoveAvatar() {
  const queryClient = useQueryClient()
  const { user } = useSession()

  return useMutation({
    mutationFn: removeAvatar,
    onSuccess: (profile) => queryClient.setQueryData(profileKey(user?.id), profile),
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: PasswordChangePayload) => changePassword(payload),
  })
}

export function useWallets() {
  const { user } = useSession()
  return useQuery({
    queryKey: walletsKey(user?.id),
    queryFn: fetchWallets,
    enabled: Boolean(user),
  })
}

export function useSaveWallet() {
  const queryClient = useQueryClient()
  const { user } = useSession()

  return useMutation({
    mutationFn: ({ role, payload }: { role: WalletRole; payload: WalletPayload }) => saveWallet(role, payload),
    onSuccess: (wallets) => queryClient.setQueryData(walletsKey(user?.id), wallets),
  })
}

export function useRemoveWallet() {
  const queryClient = useQueryClient()
  const { user } = useSession()

  return useMutation({
    mutationFn: (role: WalletRole) => removeWallet(role),
    onSuccess: (wallets) => queryClient.setQueryData(walletsKey(user?.id), wallets),
  })
}
