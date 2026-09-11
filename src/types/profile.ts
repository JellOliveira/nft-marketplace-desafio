// Contratos do recurso "Perfil" e "Carteiras" (item 5 do desafio).
export interface Profile {
  id: string
  displayName: string
  username: string
  email: string
  ensName: string | null
  // "Apelido da carteira" (design-refs/Desktop/Perfil do Colecionador.png): campo do perfil,
  // independente do "Apelido da carteira" da tela de Carteiras (que é por carteira). Assumido
  // como um apelido geral do colecionador — não há carteira obrigatoriamente cadastrada ainda
  // quando esse campo é preenchido.
  walletNickname: string | null
  avatarUrl: string | null
}

export interface ProfileUpdatePayload {
  displayName: string
  username: string
  email: string
  ensName: string | null
  walletNickname: string | null
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
  profileName: string
  address: string
  ensOrSecondary: string | null
  walletType: string
  referralCode: string
  email: string
  ensName: string | null
}

export interface WalletPayload {
  displayName: string
  nickname: string
  network: string
  profileName: string
  address: string
  ensOrSecondary: string | null
  walletType: string
  referralCode: string
  email: string
  ensName: string | null
}
