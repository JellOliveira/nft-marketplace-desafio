import { cn } from 'cn'

// Skeleton com efeito shimmer (exigido pelo item 8 do desafio) — um brilho que varre da
// esquerda para a direita, em vez do "pulse" padrão do shadcn/ui. A animação é definida em
// src/index.css (`.skeleton-shimmer`), que já respeita `prefers-reduced-motion` globalmente.
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('skeleton-shimmer rounded-md bg-brand-elevated', className)}
      {...props}
    />
  )
}

export { Skeleton }
