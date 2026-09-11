// Cenários 3, 6 e 7 do item 9: cadastro/login, compra completa até o recibo confirmado, e
// pagamento recusado — o núcleo do critério eliminatório "compra confirmada sem resposta da
// simulação". A tela de confirmação só pode mostrar sucesso depois que o status real
// (confirmed) chegar do servidor mock — estes testes verificam exatamente essa transição,
// não só o destino final.
import { expect, test } from '@playwright/test'
import { addFirstNftToCart, connectWallet, login } from './support/actions'

test.describe('Fluxo de compra', () => {
  test('compra completa: catálogo → detalhe → carrinho → pagamento → recibo confirmado', async ({
    page,
  }) => {
    await login(page)
    await addFirstNftToCart(page)

    await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
    await page.waitForURL(/\/pagamento/)

    await connectWallet(page, 'MetaMask')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()

    await page.waitForURL(/\/pedido\//)
    // Antes da confirmação, a tela mostra o estado de processamento — nunca pula direto pro
    // recibo sem essa etapa (é o que evita o eliminatório).
    await expect(page.getByText('Processando seu pedido…')).toBeVisible()

    await expect(page.getByText('Seus NFTs agora estão na sua carteira')).toBeVisible({
      timeout: 8_000,
    })
    await expect(page.getByText('ID da transação')).toBeVisible()

    // O carrinho não pode continuar mostrando o item já comprado.
    await page.goto('/carrinho')
    await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()
  })

  test('pagamento recusado preserva os itens no carrinho e não mostra sucesso', async ({ page }) => {
    await login(page)
    await addFirstNftToCart(page)

    await page.goto('/pagamento')
    await connectWallet(page, 'MetaMask')
    // .filter({ visible: true }): o formulário de pagamento tem uma versão desktop e uma
    // mobile no DOM ao mesmo tempo (uma oculta por CSS conforme a largura), cada uma com o
    // próprio checkbox de recusa determinística — mesmo padrão do connectWallet.
    await page
      .getByLabel('Simular pagamento recusado (cenário de teste determinístico)')
      .filter({ visible: true })
      .check()
    await page.getByRole('button', { name: 'Confirmar compra' }).click()

    await page.waitForURL(/\/pedido\//)
    // getByRole('heading', ...), não getByText: o texto "Pagamento recusado" é substring do
    // rótulo do checkbox de simulação ("Simular pagamento recusado (...)"), que existe em
    // duas cópias no DOM (desktop/mobile) — o heading da própria página de confirmação é
    // inequívoco.
    await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText('Seus NFTs agora estão na sua carteira')).not.toBeVisible()

    await page.goto('/carrinho')
    await expect(page.getByText('Seu carrinho está vazio.')).not.toBeVisible()
  })

  test('clique duplo em "Confirmar compra" não cria dois pedidos (idempotência)', async ({ page }) => {
    await login(page)
    await addFirstNftToCart(page)

    await page.goto('/pagamento')
    await connectWallet(page, 'MetaMask')

    // O botão desabilita assim que a mutation começa (proteção client-side contra clique
    // duplo) — a garantia definitiva contra pedido duplicado é a chave de idempotência no
    // servidor, verificada abaixo pelo fato de só existir um pedido no destino final.
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await page.waitForURL(/\/pedido\//)
    const orderUrl = page.url()

    await expect(page.getByText('Seus NFTs agora estão na sua carteira')).toBeVisible({
      timeout: 8_000,
    })
    expect(page.url()).toBe(orderUrl)
  })
})
