import { createFileRoute } from '@tanstack/react-router'
import { AuthModal } from '@/features/auth/auth-modal'

// Rota de login: aceita acesso direto e refresh (exigido pelo item 3 do desafio), e um
// parâmetro `redirect` na URL para voltar ao fluxo anterior após autenticar — é assim que o
// botão "Entrar" do header, ou qualquer tela protegida, sabe para onde mandar o usuário de
// volta. O parâmetro fica na própria URL (não em estado de componente) para sobreviver a
// um refresh no meio do fluxo de login.
export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : '/',
  }),
  component: LoginPage,
})

function LoginPage() {
  const { redirect } = Route.useSearch()
  return <AuthModal mode="login" redirectTo={redirect} />
}
