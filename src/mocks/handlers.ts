// Handlers REST do MSW. Cada recurso do contrato (item 5 do desafio) ganha seu próprio
// módulo dentro de `src/mocks/handlers/`, importado e concatenado aqui. Mantido vazio nesta
// fase inicial do scaffold — os handlers de sessão, catálogo, carrinho, cotação, pedidos,
// perfil e carteiras entram nas próximas fases, junto dos cenários de falha/latência.
import type { HttpHandler } from 'msw'

export const handlers: HttpHandler[] = []
