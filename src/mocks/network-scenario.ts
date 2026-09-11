// Estado do cenário de rede ativo (item 6.1 do desafio): lentidão, latência variável, timeout,
// indisponibilidade de conexão e respostas HTTP de erro — configuráveis e reproduzíveis, e
// reaproveitados entre dev, demonstração e testes Playwright (o mesmo ponto único que
// `network.ts` já usava para a latência fixa, agora parametrizado). Nenhum caminho de falha
// simulado existe fora da camada MSW — ver ARCHITECTURE.md, seção "Mocking".
export type NetworkScenario = 'normal' | 'slow' | 'variable' | 'timeout' | 'offline' | 'error'

export interface NetworkScenarioConfig {
  scenario: NetworkScenario
  /** Usado só no cenário "error": status HTTP devolvido em cada falha simulada. */
  errorStatus: number
  /** Usado só no cenário "error": 0–100, chance de cada requisição individual falhar.
   *  100 = toda requisição falha (determinístico); valores menores intercalam sucesso e
   *  falha de forma reprodutível (mesma semente → mesma sequência). */
  errorRate: number
  /** Semente do gerador pseudoaleatório determinístico usado pelos cenários "variable" e
   *  "error" — Math.random() não seria reproduzível entre execuções (exigido pelo item 6.1:
   *  "cenários... configuráveis e reproduzíveis"). Trocar a semente muda a sequência; manter
   *  a mesma semente reproduz exatamente a mesma sequência de latências/falhas. */
  seed: number
}

const STORAGE_KEY = 'nft-marketplace:network-scenario'

const DEFAULT_CONFIG: NetworkScenarioConfig = {
  scenario: 'normal',
  errorStatus: 503,
  errorRate: 100,
  seed: 42,
}

function readInitial(): NetworkScenarioConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_CONFIG }
    return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<NetworkScenarioConfig>) }
  } catch {
    // localStorage indisponível (SSR, modo privado bloqueado) — cenário fica só em memória.
    return { ...DEFAULT_CONFIG }
  }
}

let config: NetworkScenarioConfig = readInitial()
let rngState = config.seed

// PRNG determinístico (mulberry32) — mesma semente produz sempre a mesma sequência, o que
// Math.random() não garante entre execuções diferentes do app/dos testes.
function nextRandom(): number {
  rngState |= 0
  rngState = (rngState + 0x6d2b79f5) | 0
  let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function getNetworkScenarioConfig(): NetworkScenarioConfig {
  return config
}

/** Troca o cenário ativo. Reinicia o PRNG a partir da semente configurada, então a sequência
 *  de latências/falhas depois de chamar isto é sempre a mesma para a mesma configuração —
 *  é o que torna um cenário "error" com errorRate parcial reproduzível em teste. */
export function setNetworkScenario(patch: Partial<NetworkScenarioConfig>): NetworkScenarioConfig {
  config = { ...config, ...patch }
  rngState = config.seed
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // Sem persistência entre reloads nesse caso — não é um caminho crítico do requisito.
  }
  return config
}

export function resetNetworkScenario(): NetworkScenarioConfig {
  return setNetworkScenario(DEFAULT_CONFIG)
}

/** Único ponto de acesso ao PRNG — usado por `network.ts` para decidir latência (cenário
 *  "variable") e se uma requisição falha (cenário "error"). */
export function rollDice(): number {
  return nextRandom()
}

declare global {
  interface Window {
    /** Console/E2E: `window.__setNetworkScenario({ scenario: 'error', errorRate: 50 })`.
     *  Mesmo gatilho manual usado pelos testes Playwright do item 9.12 (skeleton sob
     *  carregamento lento, falha de rede e recuperação após nova tentativa). */
    __setNetworkScenario?: typeof setNetworkScenario
    __resetNetworkScenario?: typeof resetNetworkScenario
  }
}

export function exposeNetworkScenarioControls(): void {
  window.__setNetworkScenario = setNetworkScenario
  window.__resetNetworkScenario = resetNetworkScenario
}
