// Instância única do Axios usada por toda a aplicação. Todo acesso REST passa por aqui —
// nenhum componente ou hook chama `fetch` diretamente nem contém resposta simulada própria;
// a simulação vive inteiramente nos handlers do MSW, que interceptam estas requisições.
import axios from 'axios'
import { getGuestId } from './guest-id'
import { clearSessionToken, getSessionToken } from './session-token'

export const http = axios.create({
  baseURL: '/api',
  timeout: 15_000,
})

// Anexa o token de sessão (quando existe) e o id de visitante em toda requisição. Os
// handlers de carrinho usam o token quando presente; sem sessão, caem para o id de
// visitante — é assim que o carrinho sobrevive a um refresh mesmo antes do login.
http.interceptors.request.use((config) => {
  const token = getSessionToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  config.headers['X-Guest-Id'] = getGuestId()
  return config
})

// Evento disparado quando o servidor (mock) informa que a sessão não é mais válida (401),
// em qualquer chamada — não só na checagem explícita de sessão. O hook de autenticação
// escuta este evento para limpar o cache do usuário anterior imediatamente, em vez de
// esperar a próxima renderização perceber o 401.
export const SESSION_EXPIRED_EVENT = 'nft-marketplace:session-expired'

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearSessionToken()
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
    }
    return Promise.reject(error)
  },
)
