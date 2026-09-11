// Layout compartilhado das telas de conta (design-refs/Desktop/Perfil do Colecionador.png e
// Carteiras.png): barra lateral "Meu perfil". Só "Dados do perfil" e "Carteiras" estão no
// escopo da entrega (item 3 do desafio) — Atividade, Lista de interesse, Ofertas, Arquivos
// baixados e Suporte existem apenas visualmente, como itens não-interativos, pelo mesmo
// motivo dos links do header fora de escopo.
import { Link, useNavigate } from '@tanstack/react-router'
import {
  Download,
  Heart,
  LogOut,
  MapPin,
  ShoppingCart,
  SquareActivity,
  TriangleAlert,
  User as UserIcon,
} from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { useLogout, useSession } from '@/features/auth/use-session'
import { cn } from '@/lib/utils'
import { DEFAULT_CATALOG_SEARCH } from '@/types/nft'

const OUT_OF_SCOPE_ITEMS = [
  { label: 'Atividade', icon: ShoppingCart },
  { label: 'Lista de interesse', icon: Heart },
  { label: 'Ofertas', icon: SquareActivity },
  { label: 'Arquivos baixados', icon: Download },
  { label: 'Suporte', icon: TriangleAlert },
]

export function AccountLayout({ active, children }: { active: 'perfil' | 'carteiras'; children: ReactNode }) {
  const logout = useLogout()
  const navigate = useNavigate()
  const { isAuthenticated, isLoading } = useSession()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: '/login', search: { redirect: active === 'perfil' ? '/perfil' : '/carteiras' } })
    }
  }, [isLoading, isAuthenticated, active, navigate])

  if (!isAuthenticated) return null

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col items-start gap-8 px-5 py-10 lg:flex-row lg:px-[120px]">
      {/* self-start (via items-start no pai): a moldura acompanha só a altura do próprio
       *  conteúdo do menu (design-refs/Desktop/Perfil do Colecionador.png) — sem isso, o
       *  <aside> esticava até a altura da coluna de formulário ao lado (padrão de flex row),
       *  o que deixava a moldura arredondada bem maior que o conteúdo e dava a impressão de
       *  que ela "cortava" logo abaixo do Sair em vez de fechar ali, como no Figma. */}
      <aside className="w-full shrink-0 rounded-xl bg-brand-card p-4 lg:w-[280px]">
        <h1 className="mb-4 px-2 text-lg font-bold text-brand-text">Meu perfil</h1>
        <nav className="flex flex-col gap-1" aria-label="Navegação da conta">
          <SidebarLink to="/perfil" icon={UserIcon} label="Dados do perfil" active={active === 'perfil'} />
          <SidebarLink to="/carteiras" icon={MapPin} label="Carteiras" active={active === 'carteiras'} />
          {OUT_OF_SCOPE_ITEMS.map(({ label, icon: Icon }) => (
            <span
              key={label}
              aria-disabled="true"
              title="Fora do escopo desta entrega"
              className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-brand-accent"
            >
              <Icon size={18} />
              {label}
            </span>
          ))}
          <button
            type="button"
            onClick={() => logout.mutate(undefined, { onSuccess: () => navigate({ to: '/', search: DEFAULT_CATALOG_SEARCH }) })}
            className="mt-2 flex items-center gap-3 rounded-md border-t border-brand-border px-3 pt-3 pb-1 text-sm font-bold text-brand-accent"
          >
            <LogOut size={18} />
            Sair
          </button>
        </nav>
      </aside>

      <section className="min-w-0 flex-1">{children}</section>
    </main>
  )
}

function SidebarLink({
  to,
  icon: Icon,
  label,
  active,
}: {
  to: '/perfil' | '/carteiras'
  icon: typeof UserIcon
  label: string
  active: boolean
}) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm',
        active
          ? 'border-brand-accent bg-brand-elevated font-bold text-brand-accent'
          : 'border-transparent text-brand-accent hover:bg-brand-elevated',
      )}
    >
      <Icon size={18} />
      {label}
    </Link>
  )
}
