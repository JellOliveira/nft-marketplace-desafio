// Chaves de query centralizadas para o recurso de sessão. Outras features (carrinho,
// favoritos, pedidos, perfil) importam `userScope` para prefixar suas próprias chaves com o
// id do usuário atual (ou "guest") — é essa convenção que garante isolamento de cache entre
// contas diferentes na mesma aba (item 4 do desafio: "isolamento dos dados por usuário").
export const authKeys = {
  session: ['session'] as const,
}

/** Prefixo de escopo para chaves de outras features. Usar sempre este helper em vez de
 *  escrever o id manualmente evita divergência entre "undefined", "guest" e string vazia. */
export function userScope(userId: string | null | undefined): string {
  return userId ?? 'guest'
}
