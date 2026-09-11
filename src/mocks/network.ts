// Simulação de condições de rede compartilhada por todos os handlers REST (item 6.1 do
// desafio): lentidão, latência variável, timeout, indisponibilidade de conexão e respostas
// HTTP de erro — configuráveis via `getNetworkScenarioConfig()` / `window.__setNetworkScenario`
// (ver `network-scenario.ts`) e reproduzíveis (PRNG com semente fixa, não Math.random()). O
// mesmo ponto único é usado em dev, na demonstração e pelos testes Playwright — nenhum caminho
// de falha simulado existe fora desta camada (componentes, hooks e o cliente Axios não contêm
// respostas fictícias, ver ARCHITECTURE.md).
import { HttpResponse, delay } from 'msw'
import { getNetworkScenarioConfig, rollDice } from './network-scenario'

const BASE_LATENCY_MS = 250
const SLOW_LATENCY_MS = 4000
const VARIABLE_MIN_MS = 200
const VARIABLE_MAX_MS = 3500

export type NetworkOutcome =
  | { kind: 'proceed' }
  | { kind: 'error'; response: Response }

/**
 * Chamada no início de todo handler REST, antes de montar a resposta de negócio. Aplica a
 * latência (ou suspensão indefinida, no cenário "timeout") do cenário ativo e, se o cenário
 * sortear uma falha, devolve a Response de erro pronta — o handler deve retorná-la
 * imediatamente, sem seguir com a lógica normal:
 *
 *   const outcome = await simulateNetwork()
 *   if (outcome.kind === 'error') return outcome.response
 */
export async function simulateNetwork(): Promise<NetworkOutcome> {
  const config = getNetworkScenarioConfig()

  switch (config.scenario) {
    case 'slow':
      await delay(SLOW_LATENCY_MS)
      return { kind: 'proceed' }

    case 'variable': {
      // Latência aleatória (semente fixa → sequência reproduzível) — é o que produz respostas
      // fora de ordem entre requisições concorrentes (busca/filtro digitando rápido), cenário
      // que o item 4 do desafio exige tratar via cancelamento/descarte no TanStack Query.
      const span = VARIABLE_MAX_MS - VARIABLE_MIN_MS
      await delay(VARIABLE_MIN_MS + Math.floor(rollDice() * span))
      return { kind: 'proceed' }
    }

    case 'timeout':
      // Nunca resolve: quem trata isso é o timeout do próprio Axios (15s, ver src/lib/http.ts)
      // — comportamento de uma rede que trava de verdade, não um erro HTTP simulado.
      await delay('infinite')
      return { kind: 'proceed' } // inatingível

    case 'offline':
      // Erro de rede "de verdade" (sem status HTTP) — o Axios recebe isso como ERR_NETWORK,
      // igual a uma queda de conexão real, não como um 4xx/5xx com corpo.
      return { kind: 'error', response: HttpResponse.error() }

    case 'error': {
      const roll = rollDice() * 100
      if (roll < config.errorRate) {
        return {
          kind: 'error',
          response: HttpResponse.json(
            { message: 'Falha simulada de rede — tente novamente.' },
            { status: config.errorStatus },
          ),
        }
      }
      await delay(BASE_LATENCY_MS)
      return { kind: 'proceed' }
    }

    case 'normal':
    default:
      await delay(BASE_LATENCY_MS)
      return { kind: 'proceed' }
  }
}
