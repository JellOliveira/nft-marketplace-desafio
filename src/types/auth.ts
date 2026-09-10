// Contratos compartilhados entre o cliente HTTP (Axios), o estado remoto (TanStack Query) e
// os handlers de mock (MSW) para o recurso de Sessão e Conta. Manter esses tipos num só
// lugar garante que os três pontos concordem sobre o formato dos dados (item 4 do desafio:
// "contratos tipados entre transporte, estado e interface").

/** Colecionador autenticado. Nunca inclui a senha — nem em texto claro, nem hasheada. */
export interface User {
  id: string
  name: string
  email: string
  avatarUrl: string | null
}

/** Corpo de requisição do cadastro. */
export interface RegisterPayload {
  name: string
  email: string
  password: string
}

/** Corpo de requisição do login. */
export interface LoginPayload {
  email: string
  password: string
}

/** Resposta de autenticação bem-sucedida (login ou cadastro). */
export interface AuthResponse {
  user: User
  token: string
}

/** Formato padrão de erro retornado pelos handlers mock em qualquer falha de validação,
 *  conflito ou autorização — permite que a UI trate mensagens de campo específicas. */
export interface ApiErrorBody {
  message: string
  fieldErrors?: Record<string, string>
}
