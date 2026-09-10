// Modal de autenticação (Login | Criar conta), fiel ao layout do Figma
// (design-refs/Desktop/Login.png e Cadastro.png): um único cartão de 500px sobreposto ao
// conteúdo da tela anterior, com as duas abas trocando via navegação real de rota — abrir
// direto em /login ou /cadastro, ou dar refresh em qualquer uma delas, reproduz o mesmo
// estado (exigido pelo item 3 do desafio: "retorno ao fluxo anterior").
import { Link, useNavigate } from '@tanstack/react-router'
import axios from 'axios'
import { useState, type FormEvent } from 'react'
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
}

/** Extrai a mensagem e os erros de campo de uma resposta de erro do MSW, com um texto
 *  genérico de fallback para falhas que não vieram do backend simulado (ex.: rede offline). */
function parseApiError(error: unknown): ApiErrorBody {
  if (axios.isAxiosError(error) && error.response?.data) {
    return error.response.data as ApiErrorBody
  }
  return { message: 'Não foi possível concluir agora. Tente novamente.' }
}

export function AuthModal({ mode, redirectTo }: AuthModalProps) {
  const navigate = useNavigate()

  function closeAndReturn() {
    navigate({ to: redirectTo || '/' })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && closeAndReturn()}>
      <DialogContent
        showCloseButton
        className="max-w-[500px] gap-0 rounded-2xl border border-brand-border bg-brand-card p-0 pt-12 text-brand-text sm:max-w-[500px]"
      >
        <DialogTitle className="sr-only">
          {mode === 'login' ? 'Entrar na conta' : 'Criar conta'}
        </DialogTitle>

        <div className="flex justify-center gap-2 text-lg">
          <Link
            to="/login"
            search={{ redirect: redirectTo }}
            className={mode === 'login' ? 'font-bold text-brand-accent-alt' : 'text-brand-text'}
          >
            Entrar
          </Link>
          <span className="text-brand-border">|</span>
          <Link
            to="/cadastro"
            search={{ redirect: redirectTo }}
            className={mode === 'register' ? 'font-bold text-brand-accent-alt' : 'text-brand-text'}
          >
            Criar conta
          </Link>
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
              <SocialButton label="Continuar com Google" />
              <SocialButton label="Continuar com Facebook" />
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
function SocialButton({ label }: { label: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      disabled
      title="Fora do escopo desta entrega"
      className="h-10 w-full justify-center gap-2.5 border-brand-border bg-transparent text-[13px] font-medium text-brand-text disabled:opacity-60"
    >
      {label}
    </Button>
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
