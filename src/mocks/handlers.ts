// Handlers REST do MSW. Cada recurso do contrato (item 5 do desafio) tem seu próprio módulo
// em `src/mocks/handlers/`, concatenado aqui. Os handlers de catálogo, carrinho, cotação,
// pedidos, perfil e carteiras entram nas próximas fases.
import { authHandlers } from './handlers/auth'
import { cartHandlers } from './handlers/cart'
import { favoriteHandlers } from './handlers/favorites'
import { nftHandlers } from './handlers/nfts'
import { orderHandlers } from './handlers/orders'
import { profileHandlers } from './handlers/profile'

export const handlers = [
  ...authHandlers,
  ...nftHandlers,
  ...favoriteHandlers,
  ...cartHandlers,
  ...orderHandlers,
  ...profileHandlers,
]
