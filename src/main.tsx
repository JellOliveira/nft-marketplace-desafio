import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Ativa a camada de mocks (REST + Socket.IO) por configuração de ambiente. Fica ligada
// por padrão — inclusive no build de demonstração publicado — pois o desafio roda inteiro
// sobre dados simulados, sem backend real. Pode ser desligada definindo
// VITE_ENABLE_MOCKS=false em um `.env.local` para depurar contra uma API real no futuro.
async function enableMocking() {
  const mocksEnabled = import.meta.env.VITE_ENABLE_MOCKS !== 'false'
  if (!mocksEnabled) return

  const { worker } = await import('./mocks/browser')
  return worker.start({
    onUnhandledRequest: 'warn',
  })
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
