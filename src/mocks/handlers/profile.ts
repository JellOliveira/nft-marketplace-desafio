// Handlers REST de perfil, senha e carteiras (item 5 do desafio). Todos exigem sessão
// válida — cada um lê/escreve só o registro do usuário autenticado, nunca por id informado
// pelo cliente, o que é o que garante isolamento de dados entre contas (item 5: "sem
// exposição de dados entre usuários").
import { HttpResponse, http } from 'msw'
import { sha256Hex } from '@/lib/crypto'
import type { Profile } from '@/types/profile'
import { readDb, type StoredUser, writeDb } from '../db'
import { simulateNetwork } from '../network'
import { resolveAuthenticatedUser } from './auth'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function toProfile(user: StoredUser): Profile {
  return {
    id: user.id,
    displayName: user.name,
    username: user.username,
    email: user.email,
    ensName: user.ensName,
    walletNickname: user.walletNickname ?? null,
    avatarUrl: user.avatarUrl,
  }
}

function requireAuth(request: Request) {
  const user = resolveAuthenticatedUser(request)
  if (!user) {
    return {
      user: null,
      error: HttpResponse.json({ message: 'Sessão inválida ou expirada.' }, { status: 401 }),
    }
  }
  return { user, error: null }
}

export const profileHandlers = [
  http.get('/api/profile', async ({ request }) => {
    await simulateNetwork()
    const { user, error } = requireAuth(request)
    if (!user) return error
    return HttpResponse.json(toProfile(user))
  }),

  http.patch('/api/profile', async ({ request }) => {
    await simulateNetwork()
    const { user, error } = requireAuth(request)
    if (!user) return error

    const payload = (await request.json()) as {
      displayName: string
      username: string
      email: string
      ensName: string | null
      walletNickname: string | null
    }

    const fieldErrors: Record<string, string> = {}
    if (!payload.displayName || payload.displayName.trim().length < 2) {
      fieldErrors.displayName = 'Informe um nome de exibição válido.'
    }
    if (!payload.username || payload.username.trim().length < 3) {
      fieldErrors.username = 'Nome de usuário precisa ter pelo menos 3 caracteres.'
    }
    if (!payload.email || !EMAIL_RE.test(payload.email)) {
      fieldErrors.email = 'Informe um e-mail válido.'
    }
    if (!payload.ensName?.trim()) {
      fieldErrors.ensName = 'Informe um nome ENS.'
    }
    if (!payload.walletNickname?.trim()) {
      fieldErrors.walletNickname = 'Informe um apelido para a carteira.'
    }
    if (Object.keys(fieldErrors).length > 0) {
      return HttpResponse.json(
        { message: 'Verifique os campos destacados.', fieldErrors },
        { status: 422 },
      )
    }

    const db = readDb()
    const usernameTaken = db.users.some(
      (candidate) =>
        candidate.id !== user.id && candidate.username.toLowerCase() === payload.username.toLowerCase(),
    )
    const emailTaken = db.users.some(
      (candidate) =>
        candidate.id !== user.id && candidate.email.toLowerCase() === payload.email.toLowerCase(),
    )
    if (usernameTaken || emailTaken) {
      return HttpResponse.json(
        {
          message: 'Nome de usuário ou e-mail já estão em uso.',
          fieldErrors: {
            ...(usernameTaken ? { username: 'Este nome de usuário já está em uso.' } : {}),
            ...(emailTaken ? { email: 'Este e-mail já está em uso.' } : {}),
          },
        },
        { status: 409 },
      )
    }

    const stored = db.users.find((candidate) => candidate.id === user.id)!
    stored.name = payload.displayName.trim()
    stored.username = payload.username.trim()
    stored.email = payload.email.toLowerCase()
    stored.ensName = payload.ensName?.trim() || null
    stored.walletNickname = payload.walletNickname?.trim() || null
    writeDb(db)

    return HttpResponse.json(toProfile(stored))
  }),

  http.put('/api/profile/avatar', async ({ request }) => {
    await simulateNetwork()
    const { user, error } = requireAuth(request)
    if (!user) return error

    const payload = (await request.json()) as { dataUrl: string }
    const db = readDb()
    const stored = db.users.find((candidate) => candidate.id === user.id)!
    stored.avatarUrl = payload.dataUrl
    writeDb(db)
    return HttpResponse.json(toProfile(stored))
  }),

  http.delete('/api/profile/avatar', async ({ request }) => {
    await simulateNetwork()
    const { user, error } = requireAuth(request)
    if (!user) return error

    const db = readDb()
    const stored = db.users.find((candidate) => candidate.id === user.id)!
    stored.avatarUrl = null
    writeDb(db)
    return HttpResponse.json(toProfile(stored))
  }),

  http.post('/api/profile/password', async ({ request }) => {
    await simulateNetwork()
    const { user, error } = requireAuth(request)
    if (!user) return error

    const payload = (await request.json()) as { currentPassword: string; newPassword: string }
    if (!payload.newPassword || payload.newPassword.length < 6) {
      return HttpResponse.json(
        {
          message: 'Verifique os campos destacados.',
          fieldErrors: { newPassword: 'A nova senha precisa ter pelo menos 6 caracteres.' },
        },
        { status: 422 },
      )
    }

    const db = readDb()
    const stored = db.users.find((candidate) => candidate.id === user.id)!
    const currentHash = await sha256Hex(payload.currentPassword)
    if (currentHash !== stored.passwordHash) {
      return HttpResponse.json(
        {
          message: 'Senha atual incorreta.',
          fieldErrors: { currentPassword: 'Senha atual incorreta.' },
        },
        { status: 401 },
      )
    }

    stored.passwordHash = await sha256Hex(payload.newPassword)
    writeDb(db)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/wallets', async ({ request }) => {
    await simulateNetwork()
    const { user, error } = requireAuth(request)
    if (!user) return error

    const db = readDb()
    return HttpResponse.json(db.wallets[user.id] ?? {})
  }),

  http.put('/api/wallets/:role', async ({ request, params }) => {
    await simulateNetwork()
    const { user, error } = requireAuth(request)
    if (!user) return error

    const role = params.role as 'primary' | 'secondary'
    const payload = (await request.json()) as {
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

    const fieldErrors: Record<string, string> = {}
    if (!payload.displayName?.trim()) fieldErrors.displayName = 'Informe o nome de exibição.'
    if (!payload.nickname?.trim()) fieldErrors.nickname = 'Informe um apelido para a carteira.'
    if (!payload.network) fieldErrors.network = 'Selecione uma rede.'
    if (!payload.address || !/^0x[a-fA-F0-9]{6,}$/.test(payload.address)) {
      fieldErrors.address = 'Informe um endereço de carteira válido (iniciando com 0x).'
    }
    if (!payload.walletType) fieldErrors.walletType = 'Selecione o tipo de carteira.'
    if (!payload.profileName?.trim()) fieldErrors.profileName = 'Informe o nome do perfil.'
    if (!payload.referralCode?.trim()) fieldErrors.referralCode = 'Informe o código de indicação.'
    if (!payload.email || !EMAIL_RE.test(payload.email)) {
      fieldErrors.email = 'Informe um e-mail válido.'
    }
    if (!payload.ensName?.trim()) fieldErrors.ensName = 'Informe um nome ENS.'
    if (Object.keys(fieldErrors).length > 0) {
      return HttpResponse.json(
        { message: 'Verifique os campos destacados.', fieldErrors },
        { status: 422 },
      )
    }

    const db = readDb()
    const current = db.wallets[user.id] ?? {}
    current[role] = { role, ...payload }
    db.wallets[user.id] = current
    writeDb(db)
    return HttpResponse.json(current)
  }),

  http.delete('/api/wallets/:role', async ({ request, params }) => {
    await simulateNetwork()
    const { user, error } = requireAuth(request)
    if (!user) return error

    const role = params.role as 'primary' | 'secondary'
    const db = readDb()
    const current = db.wallets[user.id] ?? {}
    delete current[role]
    db.wallets[user.id] = current
    writeDb(db)
    return HttpResponse.json(current)
  }),
]
