import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { SessionExpiryListener } from '@/features/auth/session-expiry-listener'
import { RealtimeProvider } from '@/features/realtime/realtime-provider'
import { queryClient } from '@/lib/query-client'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { MobileTabBar } from '@/components/mobile-tab-bar'

// Rota raiz: envolve toda a árvore de rotas com o provider do TanStack Query, a conexão
// Socket.IO (RealtimeProvider) e o cabeçalho fixo (presente em toda tela, inclusive atrás do
// modal de login/cadastro). O DevTools só é incluído no bundle em desenvolvimento (import
// dinâmico do próprio pacote já faz esse tree-shaking); em produção ele não aparece nem pesa
// no build.
export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionExpiryListener />
      <RealtimeProvider />
      <div className="flex min-h-screen flex-col bg-brand-bg text-brand-text">
        <SiteHeader />
        <div className="flex-1">
          <Outlet />
        </div>
        <SiteFooter />
        {/* Reserva espaço, depois do rodapé, pra barra inferior mobile (mobile-tab-bar.tsx)
         *  não cobrir o fim real da página quando ela é curta o bastante pro rodapé encostar
         *  no limite da viewport — só existe abaixo de lg, onde a barra aparece. 120px, não
         *  88px: o botão flutuante central sobe ~32px acima da própria barra (size-16
         *  centrado no topo do recorte), então o espaço "visual" ocupado é maior que a caixa
         *  de 88px da barra. */}
        <div className="h-[140px] lg:hidden" aria-hidden="true" />
      </div>
      <MobileTabBar />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
