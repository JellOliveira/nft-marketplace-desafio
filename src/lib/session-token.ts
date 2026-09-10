// Armazena o token de sessão emitido pelo mock de autenticação. Fica em localStorage (não
// em memória) para que a sessão sobreviva a um refresh de página, como exige o item 3 do
// desafio ("A sessão deve ser recuperável após refresh").
const STORAGE_KEY = 'nft-marketplace:session-token'

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setSessionToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, token)
  } catch {
    // Sem storage disponível: a sessão vive só em memória para esta aba.
  }
}

export function clearSessionToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // nada a limpar
  }
}
