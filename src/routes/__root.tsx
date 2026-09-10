import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { queryClient } from '@/lib/query-client'

// Rota raiz: envolve toda a árvore de rotas com o provider do TanStack Query. O DevTools só
// é incluído no bundle em desenvolvimento (import dinâmico do próprio pacote já faz esse
// tree-shaking); em produção ele não aparece nem pesa no build.
export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
