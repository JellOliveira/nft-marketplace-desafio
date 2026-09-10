// Cenário 1 do item 9 do desafio: busca, filtros combinados, ordenação, paginação e
// restauração pelo histórico — tudo isso vive no estado da URL (ver src/routes/index.tsx),
// então os testes verificam a própria URL, não só o que apareceu na tela.
import { expect, test } from '@playwright/test'

test.describe('Catálogo — busca, filtros e paginação', () => {
  test('busca filtra a listagem e atualiza a URL', async ({ page }) => {
    await page.goto('/')
    const searchBox = page.getByPlaceholder('Buscar NFTs, artistas, coleções…')
    await searchBox.fill('Emerald')

    await expect(page).toHaveURL(/q=Emerald/)
    // Toda linha visível do grid precisa conter o termo buscado — sem isso, a busca não
    // estaria filtrando de verdade, só decorando a URL.
    const cardTitles = page.locator('[data-testid="nft-grid"] h3')
    await expect(cardTitles.first()).toBeVisible()
    const count = await cardTitles.count()
    for (let i = 0; i < count; i++) {
      await expect(cardTitles.nth(i)).toContainText('Emerald', { ignoreCase: true })
    }
  })

  test('combinar filtro de rede com busca reinicia a paginação para a página 1', async ({ page }) => {
    await page.goto('/?page=2')
    await expect(page).toHaveURL(/page=2/)

    await page.getByRole('button', { name: 'Ethereum', exact: false }).first().click()

    // Mudar um filtro enquanto se está numa página > 1 tem que voltar pra página 1 — é uma
    // regra explícita do item 3 do desafio.
    await expect(page).toHaveURL(/network=ethereum/)
    await expect(page).not.toHaveURL(/page=2/)
  })

  test('paginação avança e o histórico do navegador restaura o estado anterior', async ({ page }) => {
    await page.goto('/')
    const firstCardTitle = page.locator('[data-testid="nft-grid"] h3').first()
    const firstPageFirstTitle = await firstCardTitle.innerText()

    await page.getByRole('button', { name: 'Próxima página' }).click()
    await expect(page).toHaveURL(/page=2/)
    // Espera o card mudar de verdade antes de ler o texto — sem isso, a leitura pode
    // acontecer antes do React processar a mudança de página (keepPreviousData mantém o
    // conteúdo anterior na tela por um instante, de propósito, para não piscar).
    await expect(firstCardTitle).not.toHaveText(firstPageFirstTitle)
    const secondPageFirstTitle = await firstCardTitle.innerText()

    await page.goBack()
    await expect(page).not.toHaveURL(/page=2/)
    await expect(firstCardTitle).toHaveText(firstPageFirstTitle)

    await page.goForward()
    await expect(page).toHaveURL(/page=2/)
    await expect(firstCardTitle).toHaveText(secondPageFirstTitle)
  })

  test('resultado vazio mostra estado dedicado, não uma tela em branco', async ({ page }) => {
    await page.goto('/?q=' + encodeURIComponent('xyz-nao-existe-nenhum-nft-com-esse-nome'))
    await expect(page.getByText('Nenhum NFT encontrado com esses filtros.')).toBeVisible()
  })
})
