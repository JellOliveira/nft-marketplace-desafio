// Barra de navegação inferior do mobile (design-refs/Mobile/Tab Bar.svg + Início.png): fixa
// no rodapé da viewport, com 4 destinos reais (Início, Favoritos, Carrinho, Perfil) e um botão
// central flutuante sobreposto ao recorte da barra. Cada ícone é um link/rota de verdade —
// nenhum deles é decorativo (item 3 do desafio: "fluxos só visuais" é condição eliminatória).
// A forma com o recorte central vem do próprio SVG de referência (curva exata do Figma, não
// vale a pena reconstruir por CSS); os ícones por cima são os componentes reais de navegação.
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { Heart, Home, ShoppingCart, SlidersHorizontal, User } from 'lucide-react'
import type { ReactNode } from 'react'
import { useCartCount } from '@/features/cart/use-cart-count'
import { useSession } from '@/features/auth/use-session'
import { cn } from '@/lib/utils'
import { DEFAULT_CATALOG_SEARCH } from '@/types/nft'

/** Só a forma do recorte central (design-refs/Mobile/Tab Bar.svg, primeiro <path> do grupo
 *  com filtro de sombra) — os demais ícones decorativos daquele arquivo pertenciam a outras
 *  telas do mesmo export do Figma e não fazem parte desta barra. */
function TabBarShape() {
  return (
    <svg
      viewBox="0 0 414 100"
      preserveAspectRatio="none"
      className="absolute inset-0 size-full"
      aria-hidden="true"
    >
      <path
        d="M282.85 0C269.09 0 256.87 8.2 251.02 20.65C243.26 37.17 226.46 48.62 207 48.62C187.54 48.62 170.74 37.18 162.98 20.65C157.13 8.2 144.9 0 131.15 0H28.93C12.95 0 0 12.95 0 28.93V100H414V28.93C414 12.95 401.05 0 385.07 0H282.85Z"
        fill="var(--color-brand-card)"
      />
    </svg>
  )
}

/** Nome do evento global usado pelo botão central para pedir à Home que abra a folha de
 *  busca/filtros (ver index.tsx) — a barra é montada uma vez no layout raiz e não tem acesso
 *  direto ao estado local daquela tela. */
export const OPEN_CATALOG_FILTERS_EVENT = 'kurio:open-catalog-filters'

export function MobileTabBar() {
  const { isAuthenticated } = useSession()
  const location = useLocation()
  const navigate = useNavigate()
  const cartCount = useCartCount()

  const favoritesActive =
    location.pathname === '/' && (location.search as Record<string, unknown>)?.favorites === true

  return (
    <nav
      aria-label="Navegação principal (mobile)"
      className="fixed inset-x-0 bottom-0 z-40 h-[88px] pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <TabBarShape />

      <div className="relative flex h-[62px] items-center justify-between px-8">
        <TabLink to="/" search={DEFAULT_CATALOG_SEARCH} active={location.pathname === '/' && !favoritesActive} label="Início">
          <Home size={22} />
        </TabLink>
        <TabLink
          to="/"
          search={{ ...DEFAULT_CATALOG_SEARCH, favorites: true }}
          active={favoritesActive}
          label="Favoritos"
        >
          <Heart size={22} />
        </TabLink>

        {/* Espaço vazio sob o botão central flutuante — evita que os dois ícones vizinhos
         *  fiquem colados nele. */}
        <span className="w-10" aria-hidden="true" />

        <TabLink to="/carrinho" active={location.pathname === '/carrinho'} label="Carrinho">
          <ShoppingCart size={22} />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-2 flex size-4 items-center justify-center rounded-full bg-brand-accent-alt text-[10px] font-bold text-brand-bg">
              {cartCount}
            </span>
          )}
        </TabLink>
        <TabLink
          to={isAuthenticated ? '/perfil' : '/login'}
          search={isAuthenticated ? undefined : { redirect: location.pathname }}
          active={location.pathname === '/perfil' || location.pathname === '/login'}
          label={isAuthenticated ? 'Perfil' : 'Entrar'}
        >
          <User size={22} />
        </TabLink>
      </div>

      {/* Botão flutuante central (design-refs/Mobile/Tab Bar.svg): abre a mesma busca/filtros
       *  do catálogo usada no topo da Home — sem tela própria no design, então reaproveita uma
       *  ação real já existente em vez de ficar decorativo. */}
      <button
        type="button"
        onClick={() => {
          if (location.pathname !== '/') {
            navigate({ to: '/', search: DEFAULT_CATALOG_SEARCH })
          }
          window.dispatchEvent(new CustomEvent(OPEN_CATALOG_FILTERS_EVENT))
        }}
        aria-label="Abrir busca e filtros"
        className="absolute top-0 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-b from-brand-accent/40 to-brand-accent text-brand-bg shadow-lg"
      >
        <SlidersHorizontal size={22} />
      </button>
    </nav>
  )
}

/** `to`/`search` genéricos (não amarrados a uma rota específica) de propósito: esta barra é
 *  montada uma vez no layout raiz e precisa apontar para destinos diferentes dependendo do
 *  estado de sessão (perfil vs. login) — o roteador tipado do TanStack Router não consegue
 *  estreitar isso numa única prop compartilhada, então o destino é validado manualmente pelas
 *  próprias rotas reais chamadas aqui (todas existem: '/', '/carrinho', '/perfil', '/login'). */
function TabLink({
  to,
  search,
  active,
  label,
  children,
}: {
  to: string
  search?: object
  active: boolean
  label: string
  children: ReactNode
}) {
  return (
    <Link
      to={to as never}
      search={search as never}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex flex-col items-center justify-center text-brand-accent/60 transition-colors',
        active && 'text-brand-accent-alt',
      )}
    >
      {children}
    </Link>
  )
}
