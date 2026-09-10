// Hooks de sessão: a fonte única de verdade sobre "quem está logado" para toda a aplicação.
// Qualquer tela que precise de autenticação (carrinho, checkout, perfil, carteiras,
// favoritos) consome `useSession()` — nenhuma delas guarda seu próprio estado de usuário.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchSession, login, logout, register } from './api'
import { authKeys } from './query-keys'
import { clearSessionToken, setSessionToken } from '@/lib/session-token'
import type { LoginPayload, RegisterPayload, User } from '@/types/auth'

export function useSession() {
  const query = useQuery({
    queryKey: authKeys.session,
    queryFn: fetchSession,
    // Sessão expirada não é um "erro" no sentido de precisar de retry — se o token for
    // inválido, tentar de novo com o mesmo token só vai falhar de novo.
    retry: false,
  })

  return {
    user: query.data ?? null,
    isAuthenticated: Boolean(query.data),
    isLoading: query.isLoading,
    isError: query.isError,
  }
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: ({ user, token }) => {
      setSessionToken(token)
      queryClient.setQueryData<User>(authKeys.session, user)
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: RegisterPayload) => register(payload),
    onSuccess: ({ user, token }) => {
      setSessionToken(token)
      queryClient.setQueryData<User>(authKeys.session, user)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      // Limpeza total do cache no logout — não apenas a query de sessão. É a única forma de
      // garantir que carrinho, favoritos, pedidos e perfil do usuário anterior não fiquem
      // visíveis (nem por um instante) para quem logar em seguida na mesma aba. Ver item 3
      // do desafio: "Logout e troca de usuário devem limpar dados privados em cache".
      clearSessionToken()
      queryClient.clear()
    },
  })
}
