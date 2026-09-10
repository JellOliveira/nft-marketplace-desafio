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

// Evento disparado quando o servidor (mock) informa que a sessão não é mais válida (401) —
// mas só para chamadas que PRESSUPÕEM sessão ativa, nunca para a própria checagem de sessão
// (`GET /auth/session`). Um 401 ali é a forma normal e esperada de descobrir "ninguém está
// logado" (todo visitante recebe um ao carregar qualquer página); tratar isso como "sessão
// expirou" limparia o cache de dados públicos (catálogo, carrinho de visitante) que estavam
// sendo buscados ao mesmo tempo por outros componentes da página — foi exatamente esse bug
// que quebrava o carregamento do catálogo/detalhe para quem abria a página deslogado.
export const SESSION_EXPIRED_EVENT = 'nft-marketplace:session-expired'

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const isSessionCheck = axios.isAxiosError(error) && error.config?.url === '/auth/session'
    if (axios.isAxiosError(error) && error.response?.status === 401 && !isSessionCheck) {
      clearSessionToken()
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
    }
    return Promise.reject(error)
  },
)
