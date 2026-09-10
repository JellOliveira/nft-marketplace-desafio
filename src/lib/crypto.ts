// Utilitário de hash para a camada de mocks. O enunciado exige "não armazene senhas em
// claro" — mesmo sendo um backend simulado que roda inteiro no navegador do avaliador, os
// registros de usuário persistidos (localStorage) guardam o hash, nunca a senha original.
// SHA-256 via Web Crypto é suficiente aqui: o objetivo é não persistir texto claro, não
// resistir a um ataque de força bruta contra um "banco" que já está no client.
export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
