// Contratos do recurso "Perfil" e "Carteiras" (item 5 do desafio).
export interface Profile {
  id: string
  displayName: string
  username: string
  email: string
  ensName: string | null
  avatarUrl: string | null
}

export interface ProfileUpdatePayload {
  displayName: string
  username: string
  email: string
  ensName: string | null
}

export interface PasswordChangePayload {
  currentPassword: string
  newPassword: string
}

export type WalletRole = 'primary' | 'secondary'

export interface Wallet {
  role: WalletRole
  displayName: string
  nickname: string
  network: string
  address: string
  ensOrSecondary: string | null
  walletType: string
}

export interface WalletPayload {
  displayName: string
  nickname: string
  network: string
  address: string
  ensOrSecondary: string | null
  walletType: string
}
