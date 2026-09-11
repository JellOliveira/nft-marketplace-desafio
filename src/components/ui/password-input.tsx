// Campo de senha com botão de mostrar/ocultar (olhinho) — usado em login e cadastro
// (design-refs: pedido do usuário para ver a senha digitada antes de enviar). Encapsula o
// <Input> padrão só trocando o `type` e reservando espaço à direita para o ícone, então
// qualquer outro campo de senha do app (troca de senha em /perfil, por exemplo) pode
// reaproveitar em vez de reimplementar o toggle.
import { Eye, EyeOff } from 'lucide-react'
import { useId, useState, type ComponentProps } from 'react'
import { Input } from './input'
import { cn } from '@/lib/utils'

export function PasswordInput({ className, ...props }: Omit<ComponentProps<typeof Input>, 'type'>) {
  const [visible, setVisible] = useState(false)
  const toggleId = useId()

  return (
    <div className="relative">
      <Input type={visible ? 'text' : 'password'} className={cn('pr-11', className)} {...props} />
      <button
        type="button"
        id={toggleId}
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visible}
        className="absolute top-1/2 right-3 -translate-y-1/2 text-brand-muted hover:text-brand-text focus-visible:text-brand-text focus-visible:outline-none"
      >
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </div>
  )
}
