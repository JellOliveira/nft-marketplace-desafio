import { RouterProvider, createRouter } from '@tanstack/react-router'
import { StrictMode } from 'react'
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
async function enableMocking() {
  const mocksEnabled = import.meta.env.VITE_ENABLE_MOCKS !== 'false'
  if (!mocksEnabled) return

  const { worker } = await import('./mocks/browser')
  return worker.start({ onUnhandledRequest: 'bypass' })
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
})
