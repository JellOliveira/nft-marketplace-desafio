// Zoom da imagem do produto (pedido do usuário: lupa no canto da foto que, ao clicar, "solta"
// a imagem para dar zoom) — overlay próprio em vez do Dialog do shadcn porque precisa de
// controle total sobre pan/zoom (transform em cima da imagem), não só um cartão centralizado.
// Zoom: roda do mouse, botões +/- e duplo clique (alterna 1x/2x no ponto clicado). Pan: arrastar
// quando ampliada. Fecha com X, ESC ou clique no fundo escuro.
import { Minus, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from 'react'
import { cn } from '@/lib/utils'

const MIN_SCALE = 1
const MAX_SCALE = 4

interface Offset {
  x: number
  y: number
}

export function ImageZoomModal({
  src,
  alt,
  onClose,
}: {
  src: string
  alt: string
  onClose: () => void
}) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)
  const frameRef = useRef<HTMLDivElement>(null)

  // ESC fecha e trava o scroll da página por trás, igual aos demais overlays do site.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  function clampOffset(nextOffset: Offset, nextScale: number): Offset {
    if (nextScale <= MIN_SCALE) return { x: 0, y: 0 }
    const frame = frameRef.current
    if (!frame) return nextOffset
    const maxX = (frame.clientWidth * (nextScale - 1)) / 2
    const maxY = (frame.clientHeight * (nextScale - 1)) / 2
    return {
      x: Math.min(maxX, Math.max(-maxX, nextOffset.x)),
      y: Math.min(maxY, Math.max(-maxY, nextOffset.y)),
    }
  }

  function applyScale(nextScale: number) {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale))
    setScale(clamped)
    setOffset((current) => clampOffset(current, clamped))
  }

  function handleWheel(event: WheelEvent) {
    event.preventDefault()
    applyScale(scale - event.deltaY * 0.0015 * scale)
  }

  function handleDoubleClick() {
    applyScale(scale > MIN_SCALE ? MIN_SCALE : 2)
  }

  function handlePointerDown(event: PointerEvent) {
    if (scale <= MIN_SCALE) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsDragging(true)
    dragRef.current = { startX: event.clientX, startY: event.clientY, originX: offset.x, originY: offset.y }
  }

  function handlePointerMove(event: PointerEvent) {
    const drag = dragRef.current
    if (!drag) return
    setOffset(
      clampOffset(
        { x: drag.originX + (event.clientX - drag.startX), y: drag.originY + (event.clientY - drag.startY) },
        scale,
      ),
    )
  }

  function handlePointerUp() {
    dragRef.current = null
    setIsDragging(false)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Zoom da imagem: ${alt}`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar zoom"
        className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <X size={20} />
      </button>

      <div
        ref={frameRef}
        className={cn(
          'relative h-[75vh] w-full max-w-4xl touch-none overflow-hidden rounded-lg',
          scale > MIN_SCALE ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in',
        )}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="size-full select-none object-contain"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
        />
      </div>

      {/* Controles de zoom (design-refs não mostram esta barra — é o comportamento do gif
       *  descrito pelo usuário: "dar uns zoom", então precisa de um jeito claro de ampliar/
       *  reduzir além da roda do mouse, que não existe em touch). */}
      <div
        className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-white/10 px-3 py-2 backdrop-blur-sm"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => applyScale(scale - 0.5)}
          disabled={scale <= MIN_SCALE}
          aria-label="Diminuir zoom"
          className="flex size-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 disabled:opacity-40"
        >
          <Minus size={16} />
        </button>
        <span className="w-10 text-center text-xs text-white">{Math.round(scale * 100)}%</span>
        <button
          type="button"
          onClick={() => applyScale(scale + 0.5)}
          disabled={scale >= MAX_SCALE}
          aria-label="Aumentar zoom"
          className="flex size-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 disabled:opacity-40"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}
