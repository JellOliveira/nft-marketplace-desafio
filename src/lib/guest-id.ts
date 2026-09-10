// Identificador de visitante (sem sessão) usado para manter o carrinho entre refreshes antes
// do login — item 3 do desafio: "Manter o carrinho após refresh e preservar os itens do
// visitante ao autenticar". Gerado uma vez e persistido em localStorage; o carrinho do
// visitante fica no mock sob esta chave até o login, quando é mesclado ao carrinho do
// usuário autenticado.
const STORAGE_KEY = 'nft-marketplace:guest-id'

export function getGuestId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY)
    if (!id) {
      id = `guest_${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem(STORAGE_KEY, id)
    }
    return id
  } catch {
    // Sem storage disponível: cada leitura gera um id novo, o que significa carrinho de
    // visitante não persiste — degradação aceitável nesse ambiente, não uma falha do app.
    return `guest_${Math.random().toString(36).slice(2, 10)}`
  }
}
