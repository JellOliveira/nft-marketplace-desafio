// Cabeçalho fixo do topo, presente em todas as telas (Figma: navbar de 45px de altura,
// container de 1200px). Links para Mercado/Criadores/Aprenda existem apenas visualmente —
// essas páginas estão fora do escopo da entrega (item 3 do desafio) e por isso não navegam
// para lugar nenhum: marcá-las como interativas seria fazer uma ação fora do escopo
// aparentar sucesso funcional, que é justamente o que o enunciado proíbe.
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { LogIn, Menu, Search, ShoppingCart } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useCartCount } from '@/features/cart/use-cart-count'
import { useLogout, useSession } from '@/features/auth/use-session'
import { useLastViewedNftId } from '@/features/catalog/use-last-viewed-nft'
import { DEFAULT_CATALOG_SEARCH } from '@/types/nft'

/** Links de navegação fora do escopo da entrega, sem tela correspondente — renderizados
 *  como não-interativos, com indicação explícita via aria/tooltip. "Mercado" é a exceção:
 *  a página de detalhe do NFT existe, então assim que o usuário visitar algum produto o
 *  item vira um link de verdade para o último visitado (ver use-last-viewed-nft.ts), em
 *  vez de continuar decorativo — não é fingir uma funcionalidade que não existe. */
const OUT_OF_SCOPE_LINKS = ['Criadores', 'Aprenda']

export function SiteHeader() {
  const { user, isAuthenticated } = useSession()
  const logout = useLogout()
  const location = useLocation()
  const navigate = useNavigate()
  const cartCount = useCartCount()
  const [searchOpen, setSearchOpen] = useState(false)
  const lastViewedNftId = useLastViewedNftId()
  const isOnNftDetail = location.pathname.startsWith('/nft/')

  const initial = user?.name.charAt(0).toUpperCase() ?? '?'

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = new FormData(event.currentTarget).get('q')
    navigate({
      to: '/',
      search: { ...DEFAULT_CATALOG_SEARCH, q: typeof value === 'string' ? value : '' },
    })
    setSearchOpen(false)
  }

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
          {lastViewedNftId ? (
            <Link
              to="/nft/$nftId"
              params={{ nftId: lastViewedNftId }}
              className={
                isOnNftDetail
                  ? 'text-base font-bold text-brand-accent-alt underline underline-offset-4'
                  : 'text-base font-normal text-brand-text hover:text-brand-accent-alt'
              }
            >
              Mercado
            </Link>
          ) : (
            <span
              aria-disabled="true"
              title="Visite um NFT para habilitar este link"
              className="cursor-not-allowed text-base font-normal text-brand-text/50"
            >
              Mercado
            </span>
          )}
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
          <div className="relative">
            <button
              type="button"
              onClick={() => setSearchOpen((open) => !open)}
              aria-label="Buscar NFTs"
              aria-expanded={searchOpen}
              className="text-brand-text/80 hover:text-brand-text"
            >
              <Search size={20} />
            </button>
            {searchOpen && (
              <form
                onSubmit={submitSearch}
                className="absolute top-full right-0 mt-3 w-[min(16rem,calc(100vw-2.5rem))] rounded-lg border border-brand-border bg-brand-card p-2 shadow-lg"
              >
                <input
                  name="q"
                  type="search"
                  autoFocus
                  placeholder="Buscar NFTs, artistas, coleções…"
                  className="h-9 w-full rounded-md border border-brand-border bg-transparent px-3 text-sm text-brand-text placeholder:text-brand-muted focus-visible:border-brand-border-focus focus-visible:outline-none"
                />
              </form>
            )}
          </div>

          <Link to="/carrinho" aria-label="Ver carrinho" className="relative text-brand-text/80 hover:text-brand-text">
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
              className="h-9 rounded-md bg-brand-accent-alt px-3 font-bold text-brand-bg hover:bg-brand-accent"
            >
              <Link to="/login" search={{ redirect: location.pathname }}>
                <LogIn className="size-4" />
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
                {lastViewedNftId ? (
                  <Link
                    to="/nft/$nftId"
                    params={{ nftId: lastViewedNftId }}
                    className={
                      isOnNftDetail
                        ? 'text-base font-bold text-brand-accent-alt underline underline-offset-4'
                        : 'text-base text-brand-text'
                    }
                  >
                    Mercado
                  </Link>
                ) : (
                  <span aria-disabled="true" className="text-base text-brand-text/50">
                    Mercado
                  </span>
                )}
                {OUT_OF_SCOPE_LINKS.map((label) => (
                  <span key={label} aria-disabled="true" className="text-base text-brand-text/50">
                    {label}
                  </span>
                ))}
                {!isAuthenticated && (
                  <Button asChild className="h-9 rounded-md bg-brand-accent-alt font-bold text-brand-bg hover:bg-brand-accent">
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
