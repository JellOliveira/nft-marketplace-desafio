// Handlers REST de favoritos: consulta, inclusão e remoção — exigem sessão válida e
// persistem por usuário (item 3 do desafio: "Favoritos devem persistir para o usuário
// autenticado"). A lista de ids favoritados vive em src/mocks/db.ts, isolada por
// userId, então trocar de conta nunca mistura favoritos de contas diferentes.
import { HttpResponse, http } from 'msw'
import { readDb, writeDb } from '../db'
import { simulateNetwork } from '../network'
import { resolveAuthenticatedUser } from './auth'

function requireAuth(request: Request) {
  const user = resolveAuthenticatedUser(request)
  if (!user) {
    return { user: null, error: HttpResponse.json({ message: 'Sessão inválida ou expirada.' }, { status: 401 }) }
  }
  return { user, error: null }
}

export const favoriteHandlers = [
  http.get('/api/favorites', async ({ request }) => {
    await simulateNetwork()
    const { user, error } = requireAuth(request)
    if (!user) return error

    const db = readDb()
    return HttpResponse.json({ nftIds: db.favorites[user.id] ?? [] })
  }),

  http.post('/api/favorites/:nftId', async ({ request, params }) => {
    await simulateNetwork()
    const { user, error } = requireAuth(request)
    if (!user) return error

    // Escotilha só para o teste de rollback otimista (tests/auth-flow.spec.ts): liga uma
    // falha determinística sem depender de interceptar a requisição pelo Playwright, que não
    // é confiável aqui — o worker do MSW roda os handlers na mesma janela da página (só a
    // interceptação em si acontece no service worker), então essa flag em `window`, setada
    // pelo teste via page.evaluate, é visível pra este handler.
    if (typeof window !== 'undefined' && (window as { __forceFavoriteFailure?: boolean }).__forceFavoriteFailure) {
      return HttpResponse.json({ message: 'Falha simulada.' }, { status: 500 })
    }

    const db = readDb()
    const current = db.favorites[user.id] ?? []
    if (!current.includes(String(params.nftId))) {
      db.favorites[user.id] = [...current, String(params.nftId)]
      writeDb(db)
    }
    return HttpResponse.json({ nftIds: db.favorites[user.id] })
  }),

  http.delete('/api/favorites/:nftId', async ({ request, params }) => {
    await simulateNetwork()
    const { user, error } = requireAuth(request)
    if (!user) return error

    const db = readDb()
    db.favorites[user.id] = (db.favorites[user.id] ?? []).filter((id) => id !== params.nftId)
    writeDb(db)
    return HttpResponse.json({ nftIds: db.favorites[user.id] })
  }),
]
