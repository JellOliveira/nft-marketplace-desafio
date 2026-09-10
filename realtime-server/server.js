// Servidor Socket.IO real usado pelos eventos de tempo real do desafio (nft.updated,
// order.updated). Ele é deliberadamente "burro": não guarda o catálogo nem os pedidos —
// essas fontes de verdade continuam nos mocks do MSW, que rodam no navegador do próprio
// usuário. Este servidor só relaia, para um socket.io-client real, os anúncios que o próprio
// app (rodando no navegador) pede para ele emitir — no caso de `order.updated`, sempre para
// o socket que pediu; no caso de `nft.updated`, para todos os sockets conectados. Ver a
// seção "Tempo real" em ARCHITECTURE.md, na raiz do projeto, para o motivo desta arquitetura
// (o binding sugerido pelo enunciado, @mswjs/socket.io-binding, não funciona com o
// socket.io-client real — ver ARCHITECTURE.md para os detalhes do problema encontrado).
import cors from 'cors'
import express from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'

const PORT = process.env.PORT || 4001

// Múltiplas origens permitidas, separadas por vírgula (ex.: preview + produção na Vercel).
// Em desenvolvimento local, libera qualquer porta do localhost.
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

function isOriginAllowed(origin) {
  if (!origin) return true // requisições sem header Origin (ex.: curl de health check)
  if (allowedOrigins.includes(origin)) return true
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true
  return false
}

const app = express()
app.use(cors({ origin: (origin, callback) => callback(null, isOriginAllowed(origin)) }))

// Health check simples — usado pelo Render (e por qualquer humano curioso) para confirmar
// que o serviço está de pé. Também documenta, em texto simples, o que este servidor é.
app.get('/', (_req, res) => {
  res.json({
    service: 'nft-marketplace-realtime',
    status: 'ok',
    description: 'Relay Socket.IO para os eventos nft.updated e order.updated do desafio.',
  })
})

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: (origin, callback) => callback(null, isOriginAllowed(origin)) },
})

io.on('connection', (socket) => {
  // Um cliente acabou de criar um pedido e quer ser avisado, mais tarde, do resultado da
  // simulação. `delayMs` e `status` são decididos pelo mock (que sabe as regras de
  // idempotência, revalidação etc.) — este servidor só agenda o eco.
  socket.on('order:watch', ({ orderId, status, version, delayMs }) => {
    if (!orderId || !status) return
    const safeDelay = Math.min(Math.max(Number(delayMs) || 0, 0), 15_000)
    setTimeout(() => {
      socket.emit('order.updated', { orderId, status, version })
    }, safeDelay)
  })

  // Um cliente decidiu (localmente, via o mesmo mock) que o preço/disponibilidade de um NFT
  // mudou, e quer anunciar isso para quem mais estiver com o app aberto — inclusive para si
  // mesmo, fechando o ciclo real através do socket.io-client.
  socket.on('nft:announce', (payload) => {
    if (!payload?.nftId) return
    io.emit('nft.updated', payload)
  })
})

httpServer.listen(PORT, () => {
  console.log(`[realtime] ouvindo na porta ${PORT}`)
})
