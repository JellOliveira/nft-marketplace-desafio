// Cenários 9 e 10 do item 9: alteração de preço/disponibilidade via Socket.IO durante o
// checkout, e o bloqueio de confirmação com cotação desatualizada (item 7 do desafio). O
// evento é disparado via `window.__triggerNftUpdate`, o gatilho determinístico exposto só
// para isto (ver src/features/realtime/scenario-triggers.ts) — sem ele, o teste dependeria
// do temporizador ambiente aleatório, o que tornaria o resultado não reprodutível.
//
// Exige o servidor de tempo real rodando localmente (`npm run dev:realtime` ou
// `node realtime-server/server.js`) — sem ele, o evento nunca chega e este teste falha
// mostrando exatamente isso, o que é o comportamento correto: o requisito é o evento passar
// pelo socket.io-client de verdade, não por um atalho de teste.
import { expect, test } from '@playwright/test'
import { addFirstNftToCart, connectWallet, login } from './support/actions'

test.describe('Tempo real — Socket.IO', () => {
  test('mudança de preço ao vivo atualiza o carrinho e bloqueia o checkout até revisar', async ({
    page,
  }) => {
    await login(page)
    const nftId = await addFirstNftToCart(page)

    await page.waitForFunction(() => typeof window.__triggerNftUpdate === 'function')
    await page.evaluate((id) => window.__triggerNftUpdate?.(id, { priceEth: '99.99' }), nftId)

    // A interface precisa refletir a mudança no resumo do carrinho automaticamente, sem
    // precisar de refresh.
    // O total da linha (sempre visível, inclusive no mobile) é o valor mais confiável de
    // checar aqui — o preço unitário some em telas estreitas para não apertar o layout.
    await expect(page.getByTestId('cart-line-total')).toHaveText('99.99 ETH', { timeout: 5_000 })

    await page.getByRole('link', { name: 'Ir para o pagamento' }).click()
    await page.waitForURL(/\/pagamento/)
    await connectWallet(page, 'MetaMask')

    // Mais uma mudança agora que a cotação já foi "vista" na tela de pagamento.
    await page.evaluate((id) => window.__triggerNftUpdate?.(id, { priceEth: '55.55' }), nftId)

    await expect(page.getByText('Os valores do carrinho mudaram')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()

    await page.getByRole('button', { name: 'Revisar e continuar' }).click()
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
  })
})

declare global {
  interface Window {
    __triggerNftUpdate?: (nftId: string, patch: { priceEth?: string; availableQuantity?: number }) => void
  }
}
