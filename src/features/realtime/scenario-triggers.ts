// Disparo de cenários de tempo real. Dois modos, os dois passam pelo mesmo caminho real
// (aplica localmente com versão + emite para o servidor de tempo real, que ecoa de volta
// pelo socket.io-client — nunca escreve na UI diretamente):
//
// 1. Ambiente: a cada ~25s, muda o preço de um NFT aleatório do catálogo — só para a
//    demonstração parecer viva durante uma revisão manual.
// 2. Determinístico: `window.__triggerNftUpdate(nftId, patch)`, exposto só em desenvolvimento
//    e no build de mocks ativado, para os testes Playwright do item 9 do desafio disparem um
//    evento específico sem depender de esperar o temporizador aleatório (item 9: "Controle
//    relógio, latência e disparo dos eventos nos cenários sensíveis a tempo").
import { NFT_CATALOG } from '@/mocks/data/nfts'
import { nextNftVersion, setNftOverride } from '@/mocks/nft-overrides'
import { socket } from '@/lib/socket'

function announceNftChange(nftId: string, patch: { priceEth?: string; availableQuantity?: number }) {
  const version = nextNftVersion(nftId)
  setNftOverride(nftId, patch, version)
  socket.emit('nft:announce', { nftId, ...patch, version })
}

const AMBIENT_INTERVAL_MS = 25_000

export function startAmbientNftScenario(): () => void {
  // Ver .env.test: desligado durante os testes E2E, porque todos os testes que rodam em
  // paralelo compartilham o mesmo servidor de tempo real — um anúncio ambiente de um teste
  // vazaria, via broadcast real do socket, para o carrinho de outro teste completamente
  // não relacionado.
  if (import.meta.env.VITE_DISABLE_AMBIENT_REALTIME === 'true') {
    return () => {}
  }

  const timer = window.setInterval(() => {
    const target = NFT_CATALOG[Math.floor(Math.random() * NFT_CATALOG.length)]
    const priceDelta = (Math.random() - 0.5) * 0.2 // pequena variação, pra cima ou pra baixo
    const nextPrice = Math.max(0.01, Number(target.priceEth) + priceDelta).toFixed(2)
    announceNftChange(target.id, { priceEth: nextPrice })
  }, AMBIENT_INTERVAL_MS)

  return () => window.clearInterval(timer)
}

declare global {
  interface Window {
    __triggerNftUpdate?: (nftId: string, patch: { priceEth?: string; availableQuantity?: number }) => void
  }
}

export function exposeDeterministicTrigger() {
  window.__triggerNftUpdate = announceNftChange
}
