// Simulação de condições de rede compartilhada por todos os handlers REST (item 6 do
// desafio). Nesta fase inicial aplica uma latência realista fixa; o seletor de cenário
// (lento, instável, offline, taxas de erro configuráveis) entra na fase dedicada de
// mocking, reaproveitando este mesmo ponto único — os handlers de cada recurso não mudam
// quando o cenário for expandido.
import { delay } from 'msw'

const BASE_LATENCY_MS = 250

export async function simulateNetwork(): Promise<void> {
  await delay(BASE_LATENCY_MS)
}
