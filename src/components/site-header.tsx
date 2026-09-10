// Cabeçalho fixo do topo, presente em todas as telas (Figma: navbar de 45px de altura,
// container de 1200px). Links para Mercado/Criadores/Aprenda existem apenas visualmente —
// essas páginas estão fora do escopo da entrega (item 3 do desafio) e por isso não navegam
// para lugar nenhum: marcá-las como interativas seria fazer uma ação fora do escopo
// aparentar sucesso funcional, que é justamente o que o enunciado proíbe.
import { Link, useLocation } from '@tanstack/react-router'
import { Menu, Search, ShoppingCart, User as UserIcon } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useCartCount } from '@/features/cart/use-cart-count'
import { useLogout, useSession } from '@/features/auth/use-session'
import { DEFAULT_CATALOG_SEARCH } from '@/types/nft'

/** Links de navegação fora do escopo da entrega — renderizados como não-interativos,
 *  visualmente idênticos ao link ativo, com indicação explícita via aria/tooltip. */
const OUT_OF_SCOPE_LINKS = ['Mercado', 'Criadores', 'Aprenda']

export function SiteHeader() {
  const { user, isAuthenticated } = useSession()
  const logout = useLogout()
  const location = useLocation()
  const cartCount = useCartCount()

  const initial = user?.name.charAt(0).toUpperCase() ?? '?'

  return (
    <header className="border-b border-brand-border/60">
      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-5 lg:px-[120px]">
        <Link to="/" search={DEFAULT_CATALOG_SEARCH} className="text-sm font-bold tracking-[1.4px] text-brand-text">
          KURIO
        </Link>

        <nav className="hidden items-center gap-10 md:flex" aria-label="Navegação principal">
          <Link
            to="/" search={DEFAULT_CATALOG_SEARCH}
            className="text-base font-bold text-brand-text [&.active]:text-brand-accent-alt"
            activeProps={{ className: 'active' }}
          >
            Início
          </Link>
          {OUT_OF_SCOPE_LINKS.map((label) => (
            <span
              key={label}
              aria-disabled="true"
              title="Fora do escopo desta entrega"
              className="cursor-not-allowed text-base font-normal text-brand-text/50"
            >
              {label}
            </span>
          ))}
        </nav>

        <div className="flex items-center gap-4 lg:gap-7">
          <Link
            to="/" search={DEFAULT_CATALOG_SEARCH}
            aria-label="Buscar NFTs"
            className="hidden text-brand-text/80 hover:text-brand-text sm:block"
          >
            <Search size={20} />
          </Link>

          <Link to="/" search={DEFAULT_CATALOG_SEARCH} aria-label="Ver carrinho" className="relative text-brand-text/80 hover:text-brand-text">
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 flex size-4 items-center justify-center rounded-full bg-brand-accent-alt text-[10px] font-medium text-brand-card">
                {cartCount}
              </span>
            )}
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link to="/perfil" className="flex items-center gap-2" aria-label="Ver perfil">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-brand-accent-alt text-brand-card">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm text-brand-text lg:inline">{user?.name}</span>
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-brand-text hover:bg-brand-elevated hover:text-brand-text"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
              >
                Sair
              </Button>
            </div>
          ) : (
            <Button
              asChild
              className="bg-brand-accent-alt text-brand-card hover:bg-brand-accent"
              size="sm"
            >
              <Link to="/login" search={{ redirect: location.pathname }}>
                <UserIcon className="size-4" />
                Entrar
              </Link>
            </Button>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-brand-text md:hidden">
                <Menu />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="border-brand-border bg-brand-card text-brand-text"
            >
              <nav className="mt-10 flex flex-col gap-6 px-4" aria-label="Navegação principal (mobile)">
                <Link to="/" search={DEFAULT_CATALOG_SEARCH} className="text-base font-bold text-brand-text">
                  Início
                </Link>
                {OUT_OF_SCOPE_LINKS.map((label) => (
                  <span key={label} aria-disabled="true" className="text-base text-brand-text/50">
                    {label}
                  </span>
                ))}
                {!isAuthenticated && (
                  <Button asChild className="bg-brand-accent-alt text-brand-card hover:bg-brand-accent">
                    <Link to="/login" search={{ redirect: location.pathname }}>
                      Entrar
                    </Link>
                  </Button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
