// Funções de acesso ao recurso de sessão/conta. Toda chamada passa pela instância única do
// Axios (src/lib/http.ts) — nenhuma lógica de mock ou resposta fictícia mora aqui, só a
// chamada HTTP tipada e o mapeamento de payload.
import axios from 'axios'
import { http } from '@/lib/http'
import type { AuthResponse, LoginPayload, RegisterPayload, User } from '@/types/auth'

/** `null` é uma resposta válida aqui (visitante sem sessão) — só propaga erro de fato quando
 *  a falha não for "não autenticado", para que o estado de erro da UI reflita problemas
 *  reais (ex.: 500, falha de rede) e não o caso comum de ninguém estar logado. */
export async function fetchSession(): Promise<User | null> {
  try {
    const { data } = await http.get<{ user: User }>('/auth/session')
    return data.user
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return null
    }
    throw error
  }
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await http.post<AuthResponse>('/auth/login', payload)
  return data
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await http.post<AuthResponse>('/auth/register', payload)
  return data
}

export async function logout(): Promise<void> {
  await http.post('/auth/logout')
}
