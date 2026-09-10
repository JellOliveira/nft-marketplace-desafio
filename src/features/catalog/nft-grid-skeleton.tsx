import { Skeleton } from '@/components/ui/skeleton'

// Skeleton do grid de NFTs — mesmas proporções do NftCard real (imagem quadrada + duas
// linhas de texto) para não deslocar o layout quando os dados chegam (item 8 do desafio).
export function NftGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Carregando NFTs">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-xl bg-brand-card">
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
