// Cenário 2 do item 9: acesso direto ao detalhe e tratamento de NFT inexistente — sem
// depender de ter navegado a partir do catálogo (item 3: "O detalhe deve suportar acesso
// direto... e NFT inexistente").
import { expect, test } from '@playwright/test'

test.describe('Detalhe do NFT — acesso direto', () => {
  test('acesso direto a um NFT existente carrega os dados reais', async ({ page }) => {
    await page.goto('/nft/nft_1')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText('Sobre este NFT:')).toBeVisible()
    await expect(page.getByRole('button', { name: /Comprar|Esgotado/ })).toBeVisible()
  })

  test('NFT inexistente mostra tela de erro dedicada, não uma tela em branco ou quebrada', async ({
    page,
  }) => {
    await page.goto('/nft/nft-que-nao-existe-99999')
    await expect(page.getByText('NFT não encontrado')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Voltar ao catálogo' })).toBeVisible()
  })

  test('refresh na página de detalhe preserva o mesmo NFT', async ({ page }) => {
    await page.goto('/nft/nft_1')
    const title = await page.getByRole('heading', { level: 1 }).innerText()

    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
  })
})
