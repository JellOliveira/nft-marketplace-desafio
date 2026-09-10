// Cliente Socket.IO real e único da aplicação. Conecta no servidor de tempo real (ver
// realtime-server/ e ARCHITECTURE.md) — em desenvolvimento, `VITE_SOCKET_URL` aponta para o
// servidor local (ver .env.development); em produção, para o serviço publicado no Render.
// Nenhum componente ou hook cria seu próprio socket: todos importam esta instância.
import { io, type Socket } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4001'

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket'],
})

// Log leve e sempre ativo (não só em DEV): confirmar visualmente, no console do navegador,
// que o transporte Socket.IO real está de fato conectado é parte do que este projeto precisa
// demonstrar (ver ARCHITECTURE.md, seção "Tempo real").
socket.on('connect', () => console.info('[socket] conectado a', SOCKET_URL))
socket.on('disconnect', (reason) => console.info('[socket] desconectado:', reason))
socket.on('connect_error', (error) => console.warn('[socket] erro de conexão:', error.message))
