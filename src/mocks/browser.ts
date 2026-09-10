// Worker do MSW para o navegador. Intercepta as chamadas REST feitas pelo Axios, servindo
// as respostas simuladas definidas em `handlers.ts`. O transporte de tempo real (Socket.IO)
// é tratado separadamente por um servidor real (ver ARCHITECTURE.md, seção "Tempo real") —
// a tentativa de interceptá-lo também via MSW (`@mswjs/socket.io-binding`) foi descartada
// após confirmar, em smoke test, que o matcher de WebSocket dessa integração não reconhece
// URLs com query string, e o `socket.io-client` sempre anexa uma (`?EIO=...&transport=...`)
// de forma não configurável.
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)
