import { http } from '@/lib/http'
import type {
  PasswordChangePayload,
  Profile,
  ProfileUpdatePayload,
  Wallet,
  WalletPayload,
  WalletRole,
} from '@/types/profile'

export async function fetchProfile(): Promise<Profile> {
  const { data } = await http.get<Profile>('/profile')
  return data
}

export async function updateProfile(payload: ProfileUpdatePayload): Promise<Profile> {
  const { data } = await http.patch<Profile>('/profile', payload)
  return data
}

export async function uploadAvatar(dataUrl: string): Promise<Profile> {
  const { data } = await http.put<Profile>('/profile/avatar', { dataUrl })
  return data
}

export async function removeAvatar(): Promise<Profile> {
  const { data } = await http.delete<Profile>('/profile/avatar')
  return data
}

export async function changePassword(payload: PasswordChangePayload): Promise<void> {
  await http.post('/profile/password', payload)
}

export interface WalletsResponse {
  primary?: Wallet
  secondary?: Wallet
}

export async function fetchWallets(): Promise<WalletsResponse> {
  const { data } = await http.get<WalletsResponse>('/wallets')
  return data
}

export async function saveWallet(role: WalletRole, payload: WalletPayload): Promise<WalletsResponse> {
  const { data } = await http.put<WalletsResponse>(`/wallets/${role}`, payload)
  return data
}

export async function removeWallet(role: WalletRole): Promise<WalletsResponse> {
  const { data } = await http.delete<WalletsResponse>(`/wallets/${role}`)
  return data
}
