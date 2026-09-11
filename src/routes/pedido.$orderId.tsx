// Confirmação de pedido (design-refs/Desktop/Confirmação de Pedido.png). Esta tela só
// mostra "sucesso" quando `order.status === 'confirmed'` chega da API — nunca antes disso.
// Enquanto pendente, mostra um estado de processamento real (não um spinner cosmético
// disfarçando uma confirmação já assumida); se a simulação recusar, mostra a recusa. É essa
// disciplina que evita o eliminatório "compra confirmada sem resposta da simulação".
import { createFileRoute, Link } from '@tanstack/react-router'
import { Loader2, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
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
        <ThankYouIcon className="mx-auto mb-4 size-16 text-brand-accent-alt" />
        <h1 className="text-lg font-bold text-brand-muted">Seus NFTs agora estão na sua carteira</h1>
      </div>

      {/* Rótulo e valor no mesmo tom (text-brand-muted), linha centralizada — pedido explícito
       *  do usuário, substituindo o rótulo em branco/negrito que estava aqui antes. */}
      {/* Um único conjunto de padding entre vizinhos (pr-3 + pl-3 = 24px), não dois (o px-6 dos
       *  itens do meio somava com o vizinho e dobrava o espaçamento real entre colunas) — era
       *  isso que estourava a largura do card e jogava "Carteira" para uma segunda linha em
       *  vez de ficar ao lado de "Total", como no design-refs/Desktop/Confirmação de Pedido.png. */}
      <dl className="flex flex-wrap justify-center divide-x divide-brand-border border-b border-brand-border p-6 text-center text-sm">
        <div className="pr-3">
          <dt className="font-bold text-brand-muted">ID da transação</dt>
          <dd className="text-brand-muted">{shortTxHash}</dd>
        </div>
        <div className="px-3">
          <dt className="font-bold text-brand-muted">Data</dt>
          <dd className="text-brand-muted">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</dd>
        </div>
        <div className="px-3">
          <dt className="font-bold text-brand-muted">Total</dt>
          <dd className="text-brand-muted">{order.totalEth} ETH</dd>
        </div>
        <div className="pl-3">
          <dt className="font-bold text-brand-muted">Carteira</dt>
          <dd className="text-brand-muted">{order.walletType}</dd>
        </div>
      </dl>

      <div className="p-6">
        <h2 className="mb-4 font-bold text-brand-text">Detalhes da transação</h2>

        {/* Cabeçalho das colunas (design-refs/Confirmação de Pedido.png): "Edições" mostra a
         *  quantidade comprada de cada NFT, igual à coluna de mesmo nome no carrinho — antes
         *  esse número aparecia sem rótulo nenhum. */}
        <div className="mb-2 flex items-center gap-4 text-sm font-bold text-brand-text">
          <span className="w-14 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">NFTs</span>
          <span className="w-16 shrink-0 text-center">Edições</span>
          <span className="shrink-0 text-right">Subtotal</span>
        </div>
        <div className="mb-4 h-px bg-brand-accent-alt/30" aria-hidden="true" />

        <ul className="flex flex-col gap-4">
          {order.lines.map((line) => (
            <li key={`${line.nftId}-${line.edition}`} className="flex items-center gap-4">
              <img src={line.imageUrl} alt="" className="size-14 shrink-0 rounded-lg object-cover" width={56} height={56} />
              <p className="min-w-0 flex-1 truncate font-bold text-brand-text">{line.name}</p>
              <span className="w-16 shrink-0 text-center text-sm text-brand-muted">(x {line.quantity})</span>
              <span className="shrink-0 text-right text-brand-gold">
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
          Transação confirmada na {order.network}. A propriedade foi transferida para sua
          carteira conectada e registrada na rede.
        </p>
        <EtherscanButton />
      </div>

      {/* Faixa grossa ao pé do recibo (design-refs/Confirmação de Pedido.png) — puramente
       *  decorativa, fecha o cartão. */}
      <div className="h-2 bg-brand-accent-alt" aria-hidden="true" />
    </div>
  )
}

/** "Ver no Etherscan" não aponta pra lugar nenhum de verdade — é uma simulação (item 1 do
 *  desafio: sem integração real de blockchain). Em vez de deixar isso escrito no próprio
 *  rótulo do botão ou depender só do tooltip nativo do navegador (`title`), mostra uma legenda
 *  flutuante ao clicar, que some sozinha depois de alguns segundos — mais visível e também
 *  funciona em touch, onde não existe hover. */
function EtherscanButton() {
  const [showTip, setShowTip] = useState(false)

  useEffect(() => {
    if (!showTip) return
    const timeout = window.setTimeout(() => setShowTip(false), 2800)
    return () => window.clearTimeout(timeout)
  }, [showTip])

  return (
    <div className="relative mx-auto mt-4 w-fit">
      {showTip && (
        <p
          role="status"
          className="absolute -top-10 left-1/2 w-max max-w-64 -translate-x-1/2 rounded-md bg-brand-elevated px-3 py-1.5 text-center text-xs text-brand-text shadow-lg"
        >
          Simulado — não aponta para um explorador de blocos real
        </p>
      )}
      <button
        type="button"
        onClick={() => setShowTip(true)}
        className="block rounded-md bg-brand-accent-alt px-4 py-2 text-sm font-medium text-brand-card hover:bg-brand-accent"
      >
        Ver no Etherscan
      </button>
    </div>
  )
}

/** Ícone do envelope com o cartão "THANK YOU" saindo dele (design-refs/Confirmação de
 *  Pedido.png) — substitui o ícone genérico de "check" verde. Traço único (currentColor),
 *  igual ao resto dos ícones de linha do design system. */
function ThankYouIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <rect x="17" y="6" width="30" height="24" rx="2" stroke="currentColor" strokeWidth="2" />
      <text
        x="32"
        y="17"
        textAnchor="middle"
        fontSize="6.5"
        fontWeight="700"
        fill="currentColor"
        fontFamily="'Roboto Mono', monospace"
      >
        THANK
      </text>
      <text
        x="32"
        y="25.5"
        textAnchor="middle"
        fontSize="6.5"
        fontWeight="700"
        fill="currentColor"
        fontFamily="'Roboto Mono', monospace"
      >
        YOU
      </text>
      <path
        d="M8 26 L32 41 L56 26 L56 55 A2 2 0 0 1 54 57 L10 57 A2 2 0 0 1 8 55 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M8 26 L32 41 L56 26" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}
