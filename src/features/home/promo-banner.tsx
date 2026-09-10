// Os dois banners promocionais entre a grade do catálogo e o blog (design-refs/Desktop/
// Início.png). Puramente editorial — sem dado transacional por trás — então o CTA "Explorar"
// navega para o catálogo já filtrado por categoria, em vez de ser um link morto (mesmo
// padrão usado no rodapé para as categorias).
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { DEFAULT_CATALOG_SEARCH } from '@/types/nft'

interface PromoBannerProps {
  image: string
  title: string
  description: string
  category?: string
}

export function PromoBanner({ image, title, description, category }: PromoBannerProps) {
  return (
    <Link
      to="/"
      search={category ? { ...DEFAULT_CATALOG_SEARCH, category } : DEFAULT_CATALOG_SEARCH}
      className="group flex h-[220px] flex-1 overflow-hidden rounded-xl bg-brand-card"
    >
      <img
        src={image}
        alt=""
        aria-hidden
        className="h-full w-[45%] shrink-0 rounded-r-2xl object-cover"
        loading="lazy"
      />
      <div className="flex min-w-0 flex-1 flex-col items-end justify-center px-5 text-right sm:px-7">
        <h3 className="text-base font-bold text-brand-text">{title}</h3>
        <p className="mt-1 text-sm text-brand-muted">{description}</p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-brand-accent-alt px-3 py-1.5 text-xs font-bold text-brand-bg transition-colors group-hover:bg-brand-accent">
          Explorar
          <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  )
}
