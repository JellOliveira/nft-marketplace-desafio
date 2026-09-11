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
      // Empilhado no mobile (foto em cima, texto embaixo — cada um com espaço de sobra pra
      // respirar) e lado a lado a partir de sm, como já era. A versão espremida (foto 45% +
      // texto no resto, os dois dentro de 220px de altura) cabia mal em telas estreitas.
      className="group flex flex-1 flex-col overflow-hidden rounded-xl bg-brand-card sm:h-[220px] sm:flex-row"
    >
      <img
        src={image}
        alt=""
        aria-hidden
        className="h-40 w-full shrink-0 object-cover sm:h-full sm:w-[45%] sm:rounded-r-2xl"
        loading="lazy"
      />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-5 sm:items-end sm:p-0 sm:px-7 sm:text-right">
        <h3 className="text-base font-bold text-brand-text">{title}</h3>
        <p className="text-sm text-brand-muted">{description}</p>
        <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-md bg-brand-accent-alt px-3 py-1.5 text-xs font-bold text-brand-bg transition-colors group-hover:bg-brand-accent sm:mt-3">
          Explorar
          <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  )
}
