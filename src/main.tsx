import { RouterProvider, createRouter } from '@tanstack/react-router'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Árvore de rotas gerada automaticamente pelo plugin do TanStack Router a partir dos
// arquivos em src/routes/ (não editar manualmente — ver routeTree.gen.ts).
import { routeTree } from './routeTree.gen'

const router = createRouter({ routeTree })

// Registro de tipos: permite que <Link to="..."> e useNavigate() sejam checados pelo
// TypeScript contra as rotas reais da aplicação.
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Ativa a camada de mocks REST (MSW) por configuração de ambiente. Fica ligada por padrão —
// inclusive no build de demonstração publicado — pois a aplicação roda inteira sobre dados
// simulados, sem backend real. Pode ser desligada com VITE_ENABLE_MOCKS=false em um
// `.env.local` para depurar contra uma API real no futuro.
const MOCKS_ENABLED = import.meta.env.VITE_ENABLE_MOCKS !== 'false'

async function enableMocking() {
  const { worker } = await import('./mocks/browser')
  const { exposeNetworkScenarioControls } = await import('./mocks/network-scenario')
  // Expõe o seletor de cenário de rede (item 6.1: lentidão, latência variável, timeout,
  // offline, erros HTTP configuráveis) no console/testes — window.__setNetworkScenario(...).
  exposeNetworkScenarioControls()
  return worker.start({ onUnhandledRequest: 'bypass' })
}

/**
 * Antes, `enableMocking().then(() => createRoot(...).render(...))` bloqueava o React de
 * montar QUALQUER coisa até o worker do MSW terminar de carregar/registrar — o navegador
 * ficava com a tela em branco padrão (nem a cor de fundo da marca) até esse encadeamento
 * assíncrono resolver, contribuindo para o LCP na auditoria Lighthouse (item 10). Isto aqui
 * monta o React imediatamente (pinta o fundo da marca já no primeiro frame) e só troca para
 * o app de verdade quando os mocks estiverem prontos — a ordem das chamadas de rede não muda
 * em nada: nenhuma rota (e portanto nenhum hook de dado) monta antes disso, exatamente como
 * antes.
 */
function Bootstrap() {
  const [mocksReady, setMocksReady] = useState(!MOCKS_ENABLED)

  useEffect(() => {
    if (!MOCKS_ENABLED) return
    let cancelled = false
    enableMocking().then(() => {
      if (!cancelled) setMocksReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!mocksReady) {
    return <div className="min-h-screen bg-brand-bg" aria-hidden="true" />
  }

  return <RouterProvider router={router} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Bootstrap />
  </StrictMode>,
)
