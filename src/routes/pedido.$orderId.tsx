// Confirmação de pedido (design-refs/Desktop/Confirmação de Pedido.png). Esta tela só
// mostra "sucesso" quando `order.status === 'confirmed'` chega da API — nunca antes disso.
// Enquanto pendente, mostra um estado de processamento real (não um spinner cosmético
// disfarçando uma confirmação já assumida); se a simulação recusar, mostra a recusa. É essa
// disciplina que evita o eliminatório "compra confirmada sem resposta da simulação".
import { createFileRoute, Link } from '@tanstack/react-router'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { useOrder } from '@/features/orders/use-order'
import { Skeleton } from '@/components/ui/skeleton'
import { DEFAULT_CATALOG_SEARCH } from '@/types/nft'

export const Route = createFileRoute('/pedido/$orderId')({
  component: OrderConfirmationPage,
})

function OrderConfirmationPage() {
  const { orderId } = Route.useParams()
  const { data: order, isLoading, isError } = useOrder(orderId)

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-[600px] items-center justify-center px-5 py-10">
      {isLoading && <Skeleton className="h-96 w-full rounded-2xl" />}

      {isError && (
        <div className="w-full rounded-2xl bg-brand-card p-10 text-center">
          <p className="text-brand-text">Não encontramos este pedido.</p>
          <Link to="/" search={DEFAULT_CATALOG_SEARCH} className="mt-4 inline-block text-brand-accent-alt">
            Voltar ao catálogo
          </Link>
        </div>
      )}

      {order && order.status === 'pending' && (
        <div className="w-full rounded-2xl bg-brand-card p-10 text-center">
          <Loader2 className="mx-auto mb-4 size-10 animate-spin text-brand-accent-alt" />
          <h1 className="text-lg font-bold text-brand-text">Processando seu pedido…</h1>
          <p className="mt-2 text-sm text-brand-muted">
            Aguardando a confirmação da rede. Isso pode levar alguns instantes — não feche
            nem recarregue esta página, mas se recarregar, o mesmo pedido continua sendo
            acompanhado.
          </p>
        </div>
      )}

      {order && order.status === 'refused' && (
        <div className="w-full rounded-2xl bg-brand-card p-10 text-center">
          <XCircle className="mx-auto mb-4 size-10 text-brand-error" />
          <h1 className="text-lg font-bold text-brand-text">Pagamento recusado</h1>
          <p className="mt-2 text-sm text-brand-muted">
            A simulação recusou este pedido. Nenhum valor foi cobrado e os itens continuam no
            seu carrinho.
          </p>
          <Link
            to="/carrinho"
            className="mt-6 inline-block rounded-md bg-brand-accent-alt px-4 py-2 text-sm font-medium text-brand-card"
          >
            Voltar ao carrinho
          </Link>
        </div>
      )}

      {order && order.status === 'confirmed' && <ConfirmedReceipt order={order} />}
    </main>
  )
}

function ConfirmedReceipt({ order }: { order: NonNullable<ReturnType<typeof useOrder>['data']> }) {
  const shortTxHash = order.transactionHash
    ? `${order.transactionHash.slice(0, 6)}…${order.transactionHash.slice(-4)}`
    : '—'

  return (
    <div className="w-full overflow-hidden rounded-2xl bg-brand-card">
      <div className="border-b border-brand-border p-8 text-center">
        <CheckCircle2 className="mx-auto mb-4 size-10 text-brand-success" />
        <h1 className="text-lg font-bold text-brand-text">Seus NFTs agora estão na sua carteira</h1>
      </div>

      <dl className="grid grid-cols-2 gap-4 border-b border-brand-border p-6 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-brand-muted">ID da transação</dt>
          <dd className="text-brand-text">{shortTxHash}</dd>
        </div>
        <div>
          <dt className="text-brand-muted">Data</dt>
          <dd className="text-brand-text">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</dd>
        </div>
        <div>
          <dt className="text-brand-muted">Total</dt>
          <dd className="text-brand-text">{order.totalEth} ETH</dd>
        </div>
        <div>
          <dt className="text-brand-muted">Carteira</dt>
          <dd className="text-brand-text">{order.walletType}</dd>
        </div>
      </dl>

      <div className="p-6">
        <h2 className="mb-4 font-bold text-brand-text">Detalhes da transação</h2>
        <ul className="flex flex-col gap-4">
          {order.lines.map((line) => (
            <li key={`${line.nftId}-${line.edition}`} className="flex items-center gap-4">
              <img src={line.imageUrl} alt="" className="size-14 rounded-lg object-cover" width={56} height={56} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-brand-text">{line.name}</p>
                <p className="text-xs text-brand-muted">(x {line.quantity})</p>
              </div>
              <span className="text-brand-gold">
                {(Number(line.priceEth) * line.quantity).toFixed(2)} ETH
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-between border-t border-brand-border pt-4 text-sm">
          <span className="text-brand-muted">Taxa de rede</span>
          <span className="text-brand-text">{order.networkFeeEth} ETH</span>
        </div>
        <div className="mt-2 flex justify-between font-bold">
          <span className="text-brand-text">Total</span>
          <span className="text-brand-gold">{order.totalEth} ETH</span>
        </div>

        <p className="mt-6 text-center text-xs text-brand-muted">
          Transação simulada na {order.network}. Nenhuma blockchain real foi utilizada.
        </p>
        <button
          type="button"
          disabled
          title="Simulado — não aponta para um explorador de blocos real"
          className="mx-auto mt-4 block cursor-not-allowed rounded-md bg-brand-accent-alt px-4 py-2 text-sm font-medium text-brand-card opacity-60"
        >
          Ver no Etherscan (simulado)
        </button>
      </div>
    </div>
  )
}
