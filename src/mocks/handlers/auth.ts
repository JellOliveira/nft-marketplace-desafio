// Handlers REST do recurso "Sessão e conta" (item 5 do desafio): cadastro, login, consulta
// da sessão atual e logout. Todo o estado de negócio (usuários, tokens de sessão) vive em
// src/mocks/db.ts — este arquivo só valida entrada, aplica as regras de conflito/autorização
// e formata a resposta, exatamente como um backend real faria.
import { HttpResponse, http } from 'msw'
import { sha256Hex } from '@/lib/crypto'
import type { ApiErrorBody, AuthResponse, LoginPayload, RegisterPayload, User } from '@/types/auth'
import { generateId, readDb, type StoredUser, writeDb } from '../db'
import { simulateNetwork } from '../network'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Remove o hash de senha antes de devolver o usuário para o cliente — o contrato público
 *  (`User`) nunca carrega esse campo. */
function toPublicUser(user: StoredUser): User {
  const { passwordHash: _passwordHash, ...publicUser } = user
  return publicUser
}

function errorResponse(status: number, body: ApiErrorBody) {
  return HttpResponse.json(body, { status })
}

/** Mescla o carrinho do visitante (identificado pelo header X-Guest-Id) no carrinho do
 *  usuário que acabou de autenticar, somando quantidades de linhas equivalentes — exigido
 *  pelo item 3 do desafio ("preservar os itens do visitante ao autenticar"). Chamado pelos
 *  handlers de login e cadastro logo após a sessão ser criada. */
function mergeGuestCartIntoUser(db: ReturnType<typeof readDb>, request: Request, userId: string) {
  const guestId = request.headers.get('x-guest-id')
  if (!guestId || guestId === userId) return

  const guestCart = db.carts[guestId]
  if (!guestCart || guestCart.lines.length === 0) return

  const userCart = db.carts[userId] ?? { lines: [], couponCode: null, quoteVersion: 1 }
  for (const guestLine of guestCart.lines) {
    const existing = userCart.lines.find(
      (line) => line.nftId === guestLine.nftId && line.edition === guestLine.edition,
    )
    if (existing) {
      existing.quantity += guestLine.quantity
    } else {
      userCart.lines.push({ ...guestLine })
    }
  }
  userCart.quoteVersion += 1
  db.carts[userId] = userCart
  delete db.carts[guestId]
}

/** Resolve o usuário autenticado a partir do header Authorization enviado pelo Axios
 *  (ver src/lib/http.ts). Compartilhado por qualquer handler que exija sessão válida. */
export function resolveAuthenticatedUser(request: Request): StoredUser | null {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace(/^Bearer\s+/i, '')
  if (!token) return null

  const db = readDb()
  const userId = db.sessions[token]
  if (!userId) return null

  return db.users.find((user) => user.id === userId) ?? null
}

export const authHandlers = [
  http.post('/api/auth/register', async ({ request }) => {
    await simulateNetwork()
    const payload = (await request.json()) as Partial<RegisterPayload>

    const fieldErrors: Record<string, string> = {}
    if (!payload.name || payload.name.trim().length < 2) {
      fieldErrors.name = 'Informe seu nome completo.'
    }
    if (!payload.email || !EMAIL_RE.test(payload.email)) {
      fieldErrors.email = 'Informe um e-mail válido.'
    }
    if (!payload.password || payload.password.length < 6) {
      fieldErrors.password = 'A senha precisa ter pelo menos 6 caracteres.'
    }
    if (Object.keys(fieldErrors).length > 0) {
      return errorResponse(422, { message: 'Verifique os campos destacados.', fieldErrors })
    }

    const db = readDb()
    const emailTaken = db.users.some(
      (user) => user.email.toLowerCase() === payload.email!.toLowerCase(),
    )
    if (emailTaken) {
      return errorResponse(409, {
        message: 'Este e-mail já está cadastrado.',
        fieldErrors: { email: 'Este e-mail já está cadastrado.' },
      })
    }

    const passwordHash = await sha256Hex(payload.password!)
    const newUser: StoredUser = {
      id: generateId('user'),
      name: payload.name!.trim(),
      // Nome de usuário derivado do e-mail, com um sufixo curto para reduzir a chance de
      // colisão — a tela de perfil permite trocar por qualquer outro valor livremente.
      username: `${payload.email!.split('@')[0].toLowerCase()}-${generateId('u').slice(-4)}`,
      email: payload.email!.toLowerCase(),
      ensName: null,
      avatarUrl: null,
      passwordHash,
    }
    const token = generateId('token')
    db.users.push(newUser)
    db.sessions[token] = newUser.id
    mergeGuestCartIntoUser(db, request, newUser.id)
    writeDb(db)

    const body: AuthResponse = { user: toPublicUser(newUser), token }
    return HttpResponse.json(body, { status: 201 })
  }),

  http.post('/api/auth/login', async ({ request }) => {
    await simulateNetwork()
    const payload = (await request.json()) as Partial<LoginPayload>

    if (!payload.email || !payload.password) {
      return errorResponse(422, { message: 'Informe e-mail e senha.' })
    }

    const db = readDb()
    const user = db.users.find(
      (candidate) => candidate.email.toLowerCase() === payload.email!.toLowerCase(),
    )
    const passwordHash = user ? await sha256Hex(payload.password) : null

    // Mesma mensagem para "usuário inexistente" e "senha incorreta" — evita que a resposta
    // revele se um e-mail está cadastrado (prática padrão de autenticação).
    if (!user || passwordHash !== user.passwordHash) {
      return errorResponse(401, { message: 'E-mail ou senha inválidos.' })
    }

    const token = generateId('token')
    db.sessions[token] = user.id
    mergeGuestCartIntoUser(db, request, user.id)
    writeDb(db)

    const body: AuthResponse = { user: toPublicUser(user), token }
    return HttpResponse.json(body, { status: 200 })
  }),

  http.get('/api/auth/session', ({ request }) => {
    const user = resolveAuthenticatedUser(request)
    if (!user) {
      return errorResponse(401, { message: 'Sessão inválida ou expirada.' })
    }
    return HttpResponse.json({ user: toPublicUser(user) } satisfies { user: User })
  }),

  http.post('/api/auth/logout', async ({ request }) => {
    await simulateNetwork()
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace(/^Bearer\s+/i, '')
    if (token) {
      const db = readDb()
      delete db.sessions[token]
      writeDb(db)
    }
    return new HttpResponse(null, { status: 204 })
  }),
]
