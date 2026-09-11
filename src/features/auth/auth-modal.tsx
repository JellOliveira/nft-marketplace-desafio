// Modal de autenticação (Login | Criar conta), fiel ao layout do Figma
// (design-refs/Desktop/Login.png e Cadastro.png): um único cartão de 500px sobreposto ao
// conteúdo da tela anterior, com as duas abas trocando via navegação real de rota — abrir
// direto em /login ou /cadastro, ou dar refresh em qualquer uma delas, reproduz o mesmo
// estado (exigido pelo item 3 do desafio: "retorno ao fluxo anterior").
import { Link, useNavigate } from '@tanstack/react-router'
import axios from 'axios'
import { useState, type FormEvent, type ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLogin, useRegister } from './use-session'
import type { ApiErrorBody } from '@/types/auth'

interface AuthModalProps {
  mode: 'login' | 'register'
  redirectTo: string
  /** Quando informado, o modal para de navegar: fechar (Esc, clique fora, X, ou sucesso de
   *  login/cadastro) só chama este callback, sem sair da rota atual. Usado por quem embute o
   *  modal por cima de uma tela já protegida (ex.: /pagamento) — navegar de volta para
   *  `redirectTo` ali criaria um loop se a própria tela redirecionar de novo para o login
   *  por não haver sessão ainda (o bug que isso resolve). As rotas /login e /cadastro não
   *  passam esta prop e mantêm a navegação real de sempre. */
  onClose?: () => void
  /** Quando informado junto de `onClose`, as abas "Entrar | Criar conta" trocam de modo sem
   *  navegar (mesma razão do `onClose`). Sem ele, seguem como links de rota normais. */
  onModeChange?: (mode: 'login' | 'register') => void
}

/** Extrai a mensagem e os erros de campo de uma resposta de erro do MSW, com um texto
 *  genérico de fallback para falhas que não vieram do backend simulado (ex.: rede offline). */
function parseApiError(error: unknown): ApiErrorBody {
  if (axios.isAxiosError(error) && error.response?.data) {
    return error.response.data as ApiErrorBody
  }
  return { message: 'Não foi possível concluir agora. Tente novamente.' }
}

export function AuthModal({ mode, redirectTo, onClose, onModeChange }: AuthModalProps) {
  const navigate = useNavigate()

  function closeAndReturn() {
    if (onClose) {
      onClose()
      return
    }
    navigate({ to: redirectTo || '/' })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && closeAndReturn()}>
      {/* Tela cheia abaixo de sm (design-refs/Mobile/Login.png e Cadastro.png: sem cantos
       *  arredondados, sem cabeçalho/rodapé visíveis por trás) — a partir de sm volta a ser o
       *  cartão centralizado do desktop (design-refs/Desktop/Login.png). */}
      <DialogContent
        showCloseButton
        className="inset-0 top-0 left-0 h-dvh max-h-none w-full max-w-none translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-none border-0 bg-brand-bg p-0 pt-16 text-brand-text sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-[500px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:border-brand-border sm:bg-brand-card sm:pt-12"
      >
        <DialogTitle className="mb-10 text-center text-2xl font-bold tracking-[2px] text-brand-text sm:sr-only">
          KURIO
        </DialogTitle>

        <div className="flex justify-center gap-2 text-lg">
          {onModeChange ? (
            <button
              type="button"
              onClick={() => onModeChange('login')}
              className={mode === 'login' ? 'font-bold text-brand-accent-alt' : 'text-brand-text'}
            >
              Entrar
            </button>
          ) : (
            <Link
              to="/login"
              search={{ redirect: redirectTo }}
              className={mode === 'login' ? 'font-bold text-brand-accent-alt' : 'text-brand-text'}
            >
              Entrar
            </Link>
          )}
          <span className="text-brand-border">|</span>
          {onModeChange ? (
            <button
              type="button"
              onClick={() => onModeChange('register')}
              className={mode === 'register' ? 'font-bold text-brand-accent-alt' : 'text-brand-text'}
            >
              Criar conta
            </button>
          ) : (
            <Link
              to="/cadastro"
              search={{ redirect: redirectTo }}
              className={mode === 'register' ? 'font-bold text-brand-accent-alt' : 'text-brand-text'}
            >
              Criar conta
            </Link>
          )}
        </div>

        <DialogDescription className="px-10 pt-3 text-center text-sm text-brand-text">
          {mode === 'login'
            ? 'Entre para gerenciar sua carteira, coleção e perfil de criador.'
            : 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.'}
        </DialogDescription>

        <div className="px-10 pt-6 pb-10">
          {mode === 'login' ? (
            <LoginForm onSuccess={closeAndReturn} />
          ) : (
            <RegisterForm onSuccess={closeAndReturn} />
          )}

          <div className="mt-5 border-t border-brand-border pt-5">
            <p className="pb-4 text-center text-sm text-brand-text">Ou continue com</p>
            <div className="flex flex-col gap-3">
              <SocialButton label="Continuar com Google" icon={<GoogleLogo className="size-5" />} />
              <SocialButton label="Continuar com Facebook" icon={<FacebookLogo className="size-5" />} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Login e cadastro social ficam fora do escopo da entrega (item 1 do desafio: integrações
 *  reais de autenticação/carteira não fazem parte). O botão fica desabilitado em vez de
 *  simular um sucesso que não existe de verdade. */
function SocialButton({ label, icon }: { label: string; icon: ReactNode }) {
  return (
    <Button
      type="button"
      variant="outline"
      disabled
      title="Fora do escopo desta entrega"
      className="h-10 w-full justify-center gap-2.5 border-brand-border bg-transparent text-[13px] font-medium text-brand-text disabled:opacity-60"
    >
      {icon}
      {label}
    </Button>
  )
}

// lucide-react não inclui logos de marca — SVGs oficiais mínimos, só para estes dois botões.
function GoogleLogo(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.94-2.91l-3.87-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.61H1.27a12 12 0 0 0 0 10.78l4-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.61l4 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  )
}

function FacebookLogo(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} aria-hidden>
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.02 4.39 11.02 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.32l-.53 3.49h-2.79v8.44C19.61 23.09 24 18.09 24 12.07Z"
      />
    </svg>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="mt-1 text-xs text-brand-error">
      {message}
    </p>
  )
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFieldErrors({})
    login.mutate(
      { email, password },
      {
        onSuccess,
        onError: (error) => {
          const body = parseApiError(error)
          setFieldErrors(body.fieldErrors ?? {})
        },
      },
    )
  }

  const generalError =
    login.isError && Object.keys(fieldErrors).length === 0
      ? parseApiError(login.error).message
      : null

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div>
        <Label htmlFor="login-email" className="sr-only">
          E-mail
        </Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="contato@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
          className="h-10 rounded-[5px] border-brand-border px-4 text-sm text-brand-text placeholder:text-brand-muted focus-visible:border-brand-border-focus focus-visible:ring-0"
          required
        />
        {fieldErrors.email && <span id="login-email-error"><FieldError message={fieldErrors.email} /></span>}
      </div>

      <div>
        <Label htmlFor="login-password" className="sr-only">
          Senha
        </Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(fieldErrors.password)}
          className="h-10 rounded-[5px] border-brand-border px-4 text-sm text-brand-text placeholder:text-brand-muted focus-visible:border-brand-border-focus focus-visible:ring-0"
          required
        />
        <FieldError message={fieldErrors.password} />
        <span
          aria-disabled="true"
          title="Fora do escopo desta entrega"
          className="mt-2 block cursor-not-allowed text-right text-sm text-brand-accent-alt/70"
        >
          Esqueceu a senha?
        </span>
      </div>

      {generalError && (
        <p role="alert" className="text-sm text-brand-error">
          {generalError}
        </p>
      )}

      <Button
        type="submit"
        disabled={login.isPending}
        className="h-[45px] rounded-[5px] bg-brand-accent-alt text-base font-medium text-brand-text hover:bg-brand-accent"
      >
        {login.isPending ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const register = useRegister()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'As senhas não conferem.' })
      return
    }
    setFieldErrors({})

    register.mutate(
      { name, email, password },
      {
        onSuccess,
        onError: (error) => {
          const body = parseApiError(error)
          setFieldErrors(body.fieldErrors ?? {})
        },
      },
    )
  }

  const generalError =
    register.isError && Object.keys(fieldErrors).length === 0
      ? parseApiError(register.error).message
      : null

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div>
        <Label htmlFor="register-name" className="sr-only">
          Nome de usuário
        </Label>
        <Input
          id="register-name"
          autoComplete="name"
          placeholder="Nome de usuário"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={Boolean(fieldErrors.name)}
          className="h-10 rounded-[5px] border-brand-border px-4 text-sm text-brand-text placeholder:text-brand-muted focus-visible:border-brand-border-focus focus-visible:ring-0"
          required
        />
        <FieldError message={fieldErrors.name} />
      </div>

      <div>
        <Label htmlFor="register-email" className="sr-only">
          E-mail
        </Label>
        <Input
          id="register-email"
          type="email"
          autoComplete="email"
          placeholder="Digite seu e-mail"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(fieldErrors.email)}
          className="h-10 rounded-[5px] border-brand-border px-4 text-sm text-brand-text placeholder:text-brand-muted focus-visible:border-brand-border-focus focus-visible:ring-0"
          required
        />
        <FieldError message={fieldErrors.email} />
      </div>

      <div>
        <Label htmlFor="register-password" className="sr-only">
          Senha
        </Label>
        <Input
          id="register-password"
          type="password"
          autoComplete="new-password"
          placeholder="Senha"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(fieldErrors.password)}
          className="h-10 rounded-[5px] border-brand-border px-4 text-sm text-brand-text placeholder:text-brand-muted focus-visible:border-brand-border-focus focus-visible:ring-0"
          required
        />
        <FieldError message={fieldErrors.password} />
      </div>

      <div>
        <Label htmlFor="register-confirm-password" className="sr-only">
          Confirmar senha
        </Label>
        <Input
          id="register-confirm-password"
          type="password"
          autoComplete="new-password"
          placeholder="Confirmar senha"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          aria-invalid={Boolean(fieldErrors.confirmPassword)}
          className="h-10 rounded-[5px] border-brand-border px-4 text-sm text-brand-text placeholder:text-brand-muted focus-visible:border-brand-border-focus focus-visible:ring-0"
          required
        />
        <FieldError message={fieldErrors.confirmPassword} />
      </div>

      {generalError && (
        <p role="alert" className="text-sm text-brand-error">
          {generalError}
        </p>
      )}

      <Button
        type="submit"
        disabled={register.isPending}
        className="h-[45px] rounded-[5px] bg-brand-accent-alt text-base font-medium text-brand-text hover:bg-brand-accent"
      >
        {register.isPending ? 'Criando conta…' : 'Criar conta'}
      </Button>
    </form>
  )
}
