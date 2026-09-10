// Ponto único de conexão e escuta do Socket.IO real (item 7 do desafio). Monta uma vez na
// raiz da aplicação (ver src/routes/__root.tsx): conecta o socket, escuta `nft.updated` e
// `order.updated`, guarda contra eventos antigos/duplicados por versão, reconcilia com a API
// REST ao reconectar, e libera os listeners ao desmontar. Nenhum componente de tela escreve
// preço/pedido diretamente — tudo passa por aqui.
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { catalogKeys } from '@/features/catalog/query-keys'
import { socket } from '@/lib/socket'
import { setNftOverride } from '@/mocks/nft-overrides'
import { exposeDeterministicTrigger, startAmbientNftScenario } from './scenario-triggers'

interface NftUpdatedPayload {
  nftId: string
  priceEth?: string
  availableQuantity?: number
  version: number
}

interface OrderUpdatedPayload {
  orderId: string
  status: 'confirmed' | 'refused'
  version: number
}

export function RealtimeProvider() {
  const queryClient = useQueryClient()
  const hasConnectedBefore = useRef(false)
  const lastOrderVersion = useRef(new Map<string, number>())
  // Deduplicação própria do handler de evento — deliberadamente separada da versão guardada
  // em nft-overrides. Quem anuncia uma mudança já aplica o override localmente ANTES de
  // emitir (ver scenario-triggers.ts), então quando o eco do próprio anúncio volta pelo
  // socket, `getNftVersion` já estaria na versão nova e o evento pareceria "antigo" se
  // comparado contra aquele mesmo contador — o que faria a aba que anunciou nunca invalidar
  // suas próprias queries. Rastrear a última versão processada AQUI evita esse falso
  // positivo, mantendo a defesa real contra eventos antigos/duplicados vindos de fora.
  const lastNftEventVersion = useRef(new Map<string, number>())

  useEffect(() => {
    function handleConnect() {
      if (!hasConnectedBefore.current) {
        hasConnectedBefore.current = true
        return
      }
      // Reconexão (não a primeira conexão): reconcilia com a API REST em vez de confiar que
      // nenhum evento foi perdido enquanto o socket estava caído (item 7 do desafio).
      queryClient.invalidateQueries({ queryKey: catalogKeys.facets })
      queryClient.invalidateQueries({ queryKey: ['nfts', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    }

    function handleNftUpdated(payload: NftUpdatedPayload) {
      const lastVersion = lastNftEventVersion.current.get(payload.nftId) ?? 0
      if (payload.version <= lastVersion) return // antigo ou duplicado
      lastNftEventVersion.current.set(payload.nftId, payload.version)

      // Aplica (idempotente: se quem anunciou já tiver aplicado localmente, isto é um
      // no-op) e então invalida tudo que pode conter este NFT — catálogo, detalhe e
      // carrinho, exatamente o cenário descrito no item 7 ("Um NFT está no carrinho. Seu
      // preço ou disponibilidade muda durante a navegação. A interface informa a alteração
      // e atualiza o resumo.").
      setNftOverride(
        payload.nftId,
        { priceEth: payload.priceEth, availableQuantity: payload.availableQuantity },
        payload.version,
      )
      queryClient.invalidateQueries({ queryKey: ['nfts'] })
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    }

    function handleOrderUpdated(payload: OrderUpdatedPayload) {
      const lastVersion = lastOrderVersion.current.get(payload.orderId) ?? 0
      if (payload.version <= lastVersion) return // antigo ou duplicado
      lastOrderVersion.current.set(payload.orderId, payload.version)

      // Não escreve o status diretamente no cache — invalida e deixa o REST (fetchOrder)
      // ser, de novo, a única fonte que decide o valor exibido. O evento só avisa "algo
      // mudou, vá conferir", nunca "assuma que mudou para X".
      queryClient.invalidateQueries({ queryKey: ['orders', payload.orderId] })
    }

    socket.on('connect', handleConnect)
    socket.on('nft.updated', handleNftUpdated)
    socket.on('order.updated', handleOrderUpdated)
    socket.connect()

    exposeDeterministicTrigger()
    const stopAmbientScenario = startAmbientNftScenario()

    return () => {
      socket.off('connect', handleConnect)
      socket.off('nft.updated', handleNftUpdated)
      socket.off('order.updated', handleOrderUpdated)
      socket.disconnect()
      stopAmbientScenario()
    }
  }, [queryClient])

  return null
}
