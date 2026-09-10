import { createFileRoute } from '@tanstack/react-router'
import { AuthModal } from '@/features/auth/auth-modal'

// Rota de cadastro — mesma lógica de /login (ver comentário lá), trocando apenas o modo
// inicial do modal.
export const Route = createFileRoute('/cadastro')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : '/',
  }),
  component: RegisterPage,
})

function RegisterPage() {
  const { redirect } = Route.useSearch()
  return <AuthModal mode="register" redirectTo={redirect} />
}
