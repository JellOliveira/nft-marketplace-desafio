// Rodapé (design-refs/Desktop/Início.png, últimas ~400px). Presente em toda tela, como o
// header (ver __root.tsx). Os links de "Coleções" reaproveitam as categorias reais do
// catálogo — clicar em "Arte digital" aqui navega para "/" com esse filtro aplicado, igual
// ao filtro da barra lateral, em vez de ser um link morto. O resto do rodapé (central de
// ajuda, estúdio do criador, etc.) não tem tela correspondente nesta entrega e segue o mesmo
// padrão do header para links fora do escopo: não-interativo, com indicação explícita.
import { Link } from '@tanstack/react-router'
import type { ReactNode, SVGProps } from 'react'
import { DEFAULT_CATALOG_SEARCH } from '@/types/nft'

// lucide-react removeu os ícones de marca (Facebook/Instagram/Linkedin/Twitter/Youtube) por
// questão de licenciamento — substituídos por SVGs inline mínimos, só o glifo essencial.
type IconProps = SVGProps<SVGSVGElement>
function FacebookIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13.5 21v-8.2h2.7l.4-3.2h-3.1V7.4c0-.9.3-1.6 1.6-1.6h1.7V2.9C16.5 2.9 15.4 2.8 14.2 2.8c-2.5 0-4.2 1.5-4.2 4.3v2.5H7.3v3.2H10V21h3.5Z" />
    </svg>
  )
}
function InstagramIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
function TwitterIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M20 5.9c-.7.3-1.4.5-2.2.6.8-.5 1.4-1.2 1.6-2.2-.7.4-1.6.8-2.4.9a3.7 3.7 0 0 0-6.4 3.4A10.6 10.6 0 0 1 3 4.9a3.7 3.7 0 0 0 1.2 5 3.7 3.7 0 0 1-1.7-.5v.1a3.7 3.7 0 0 0 3 3.6 3.8 3.8 0 0 1-1.7.1 3.7 3.7 0 0 0 3.5 2.6A7.5 7.5 0 0 1 2 17.3a10.6 10.6 0 0 0 5.7 1.7c6.9 0 10.6-5.7 10.6-10.6v-.5c.7-.5 1.3-1.2 1.7-2Z" />
    </svg>
  )
}
function LinkedinIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M4.98 3.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM3.5 9h3v11.5h-3V9Zm6.5 0h2.9v1.6h.04c.4-.75 1.4-1.6 2.9-1.6 3.1 0 3.66 2 3.66 4.6v6.9h-3v-6.1c0-1.46-.03-3.3-2-3.3-2 0-2.3 1.6-2.3 3.2v6.2h-3V9Z" />
    </svg>
  )
}
function YoutubeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M21.5 7.6a2.8 2.8 0 0 0-2-2C17.8 5.2 12 5.2 12 5.2s-5.8 0-7.5.4a2.8 2.8 0 0 0-2 2A29 29 0 0 0 2 12a29 29 0 0 0 .5 4.4 2.8 2.8 0 0 0 2 2c1.7.4 7.5.4 7.5.4s5.8 0 7.5-.4a2.8 2.8 0 0 0 2-2A29 29 0 0 0 22 12a29 29 0 0 0-.5-4.4ZM10 15.2V8.8L15.8 12 10 15.2Z" />
    </svg>
  )
}

const PROFILE_LINKS: Array<{ label: string; to?: '/perfil' }> = [
  { label: 'Meu perfil', to: '/perfil' },
  { label: 'Minha coleção' },
  { label: 'Atividade' },
  { label: 'Estúdio do criador' },
  { label: 'Lista de interesse' },
]

const HELP_LINKS = [
  'Central de ajuda',
  'Como comprar NFTs',
  'Carteira e segurança',
  'Política do mercado',
  'Denunciar item',
]

const COLLECTION_CATEGORIES = ['Arte digital', 'Fotografia', 'Música', 'Arte 3D', 'Utilidade']

const SOCIAL_LINKS = [
  { label: 'Facebook', Icon: FacebookIcon },
  { label: 'Instagram', Icon: InstagramIcon },
  { label: 'Twitter', Icon: TwitterIcon },
  { label: 'LinkedIn', Icon: LinkedinIcon },
  { label: 'YouTube', Icon: YoutubeIcon },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-brand-border/60 bg-brand-bg text-brand-text">
      <ContactStrip />

      <div className="bg-brand-card">
        <div className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8">
          <div className="flex flex-col gap-8 sm:flex-row sm:flex-wrap sm:gap-10 lg:flex-nowrap lg:gap-32">
            <FooterColumn title="Meu perfil" className="sm:flex-1">
              <ul className="flex flex-col gap-2">
                {PROFILE_LINKS.map((item) =>
                  item.to ? (
                    <li key={item.label}>
                      <Link to={item.to} className="text-sm text-brand-text hover:text-brand-accent-alt">
                        {item.label}
                      </Link>
                    </li>
                  ) : (
                    <OutOfScopeItem key={item.label} label={item.label} />
                  ),
                )}
              </ul>
            </FooterColumn>

            <FooterColumn title="Central de ajuda" className="sm:flex-1">
              <ul className="flex flex-col gap-2">
                {HELP_LINKS.map((label) => (
                  <OutOfScopeItem key={label} label={label} />
                ))}
              </ul>
            </FooterColumn>

            <FooterColumn title="Coleções" className="sm:flex-1">
              <ul className="flex flex-col gap-2">
                {COLLECTION_CATEGORIES.map((category) => (
                  <li key={category}>
                    <Link
                      to="/"
                      search={{ ...DEFAULT_CATALOG_SEARCH, category }}
                      className="text-sm text-brand-text hover:text-brand-accent-alt"
                    >
                      {category}
                    </Link>
                  </li>
                ))}
              </ul>
            </FooterColumn>

            <SocialColumn />
          </div>

          <p className="mt-10 text-center text-xs text-brand-text">
            © {new Date().getFullYear()} Kurio. Propriedade digital para todos.
          </p>
        </div>
      </div>
    </footer>
  )
}

/** Faixa de contato entre o rodapé e a faixa de destaques/newsletter (design-refs/Footer.png
 *  + Código do Detalhes do NFT.html): logo "KURIO" + descrição curta + e-mail e telefone
 *  (mailto:/tel:, reais e funcionais — não é um link "fora do escopo" fingindo uma central
 *  de contato). Faixa cheia (sem cantos arredondados, sem margem lateral), fundo
 *  bg-brand-dark — conferido por amostragem de pixel no Footer.png de referência. */
function ContactStrip() {
  return (
    <div className="bg-brand-dark">
      <div className="mx-auto flex max-w-[1200px] flex-col flex-wrap items-center gap-4 px-5 py-6 text-center sm:flex-row sm:gap-8 sm:px-8 sm:text-left lg:gap-24">
        <span className="text-sm font-bold tracking-[1.4px] text-brand-text sm:flex-1">KURIO</span>
        <p className="text-sm text-brand-text sm:flex-1">
          Feito para colecionadores,
          <br />
          criadores e cultura
        </p>
        <a
          href="mailto:contato@email.com"
          className="text-sm text-brand-text hover:text-brand-accent-alt sm:flex-1"
        >
          contato@email.com
        </a>
        <a
          href="tel:+551140028922"
          className="text-sm text-brand-text hover:text-brand-accent-alt sm:w-56"
        >
          +55 11 4002 8922
        </a>
      </div>
    </div>
  )
}

function SocialColumn() {
  return (
    <div className="sm:w-56">
      <h3 className="mb-3 text-sm font-semibold text-brand-text">Redes sociais</h3>
      <ul className="flex items-center gap-3">
        {SOCIAL_LINKS.map(({ label, Icon }) => (
          <li key={label}>
            <span
              aria-disabled="true"
              title="Fora do escopo desta entrega"
              className="flex size-7 cursor-not-allowed items-center justify-center rounded-sm outline outline-1 outline-brand-accent-alt text-brand-accent-alt"
            >
              <Icon className="size-3.5" aria-hidden />
              <span className="sr-only">{label}</span>
            </span>
          </li>
        ))}
      </ul>

      <h3 className="mt-6 mb-2 text-sm font-semibold text-brand-text">Carteiras compatíveis</h3>
      {/* text-[9px] (design-refs/Código do Detalhes do NFT.html) — em text-xs (12px) a frase
       *  não cabe numa linha só dentro da coluna de 224px e quebra ao meio. */}
      <p className="w-fit rounded-md bg-brand-dark px-3 py-1.5 text-[9px] whitespace-nowrap tracking-wide text-brand-accent-alt">
        METAMASK · WALLETCONNECT · COINBASE
      </p>
    </div>
  )
}

function FooterColumn({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <h3 className="mb-3 text-sm font-semibold text-brand-text">{title}</h3>
      {children}
    </div>
  )
}

function OutOfScopeItem({ label }: { label: string }) {
  return (
    <li>
      <span
        aria-disabled="true"
        title="Fora do escopo desta entrega"
        className="cursor-not-allowed text-sm text-brand-text/50"
      >
        {label}
      </span>
    </li>
  )
}
