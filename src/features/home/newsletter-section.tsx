// Faixa final da home: 3 destaques + inscrição de e-mail (design-refs/Desktop/Início.png).
// Fora do escopo do desafio (não há recurso de newsletter no enunciado) — o formulário não
// chama nenhuma API real nem finge que chamou: valida o formato do e-mail localmente e
// mostra uma confirmação puramente client-side, sem simular uma integração que não existe.
import { type FormEvent, useState } from 'react'
import { Bell, ShieldCheck, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

const FEATURES = [
  {
    Icon: ShieldCheck,
    title: 'Segurança da carteira',
    description: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    Icon: Users,
    title: 'Criadores em destaque',
    description: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    Icon: Bell,
    title: 'Alertas de lançamentos',
    description: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
]

export function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'subscribed' | 'invalid'>('idle')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    setStatus(isValid ? 'subscribed' : 'invalid')
  }

  return (
    <section className="border-t border-brand-border/60 bg-brand-card">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-5 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-[1fr_1fr_1fr_1.6fr]">
        {FEATURES.map(({ Icon, title, description }, index) => (
          <div
            key={title}
            className={index > 0 ? 'lg:border-l lg:border-brand-border/60 lg:pl-8' : undefined}
          >
            <span className="flex size-16 items-center justify-center rounded-full bg-brand-accent-alt text-brand-bg">
              <Icon size={26} aria-hidden />
            </span>
            <h3 className="mt-4 text-base font-bold text-brand-text">{title}</h3>
            <p className="mt-1 text-sm text-brand-gold">{description}</p>
          </div>
        ))}

        <div className="lg:border-l lg:border-brand-border/60 lg:pl-8">
          <h3 className="text-base font-bold text-brand-text">
            Antecipe-se ao próximo lançamento
          </h3>
          {/* Caixa + botão juntos, um só elemento visual — mesmo padrão do cupom promocional
           *  do carrinho/pagamento (design-refs/Código do Pagamento.html), não input e botão
           *  separados por um espaço. */}
          <form onSubmit={handleSubmit} className="mt-4 flex h-10 items-center overflow-hidden rounded-md bg-brand-dark">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Seu e-mail</span>
              <input
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.currentTarget.value)
                  setStatus('idle')
                }}
                placeholder="digite seu e-mail…"
                className="h-full w-full bg-transparent px-3 text-sm text-brand-text placeholder:text-brand-muted focus-visible:outline-none"
              />
            </label>
            <Button
              type="submit"
              className="h-full shrink-0 rounded-none bg-brand-accent-alt px-5 text-brand-card hover:bg-brand-accent"
            >
              Enviar
            </Button>
          </form>
          <p className="mt-2 text-xs text-brand-gold" role="status">
            {status === 'subscribed'
              ? 'Inscrição confirmada — obrigado!'
              : status === 'invalid'
                ? 'Informe um e-mail válido.'
                : 'Receba lançamentos selecionados, histórias de criadores e novidades do mercado.'}
          </p>
        </div>
      </div>
    </section>
  )
}
