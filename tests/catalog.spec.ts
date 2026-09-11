// Cenário 1 do item 9 do desafio: busca, filtros combinados, ordenação, paginação e
// restauração pelo histórico — tudo isso vive no estado da URL (ver src/routes/index.tsx),
// então os testes verificam a própria URL, não só o que apareceu na tela.
import { expect, test } from '@playwright/test'
import { login } from './support/actions'

test.describe('Catálogo — busca, filtros e paginação', () => {
  test('link "Ver favoritos" no cabeçalho desktop leva à lista de favoritos', async ({
    page,
  }, testInfo) => {
    // A barra inferior do mobile (mobile-tab-bar.tsx) já tem um destino "Favoritos" —
    // faltava o equivalente no cabeçalho desktop (site-header.tsx), que some abaixo de lg
    // (essa mesma barra reaparece), então quem favoritasse um NFT no desktop não tinha
    // nenhum jeito de encontrar a própria lista de favoritos depois.
    test.skip(testInfo.project.name === 'mobile-chromium', 'cabeçalho desktop só existe em lg+')

    await login(page)
    await page.goto('/')
    const firstCard = page.getByTestId('nft-grid').getByRole('link').first()
    const nftName = (await firstCard.locator('h3').innerText()).trim()
    await firstCard.click()
    await page.waitForURL(/\/nft\//)

    await page.getByRole('button', { name: 'Adicionar aos favoritos' }).first().click()
    await expect(page.getByRole('button', { name: 'Remover dos favoritos' }).first()).toBeVisible()

    await page.getByRole('link', { name: 'Ver favoritos' }).click()
    await page.waitForURL(/favorites=true/)
    await expect(page.locator('[data-testid="nft-grid"] h3').filter({ hasText: nftName })).toBeVisible()
  })


  test('busca filtra a listagem e atualiza a URL', async ({ page }, testInfo) => {
    // A Home usa um cabeçalho compacto próprio abaixo de lg (site-header.tsx:
    // hasOwnMobileHeader) sem o botão de busca por texto do cabeçalho padrão — no mobile, o
    // botão central da barra inferior abre um painel só de filtros/ordenação, sem campo de
    // busca livre (ver mobile-tab-bar.tsx e ARCHITECTURE.md, "Limitações conhecidas"). Este
    // teste cobre o fluxo real de busca, que só existe hoje no desktop.
    test.skip(testInfo.project.name === 'mobile-chromium', 'Busca por texto não tem entrada própria no mobile — ver ARCHITECTURE.md')

    await page.goto('/')
    // A busca vive só no cabeçalho, atrás do ícone de lupa (design-refs/Products.svg: não há
    // caixa de busca ao lado de "Ordenar por").
    await page.getByRole('button', { name: 'Buscar NFTs' }).click()
    const searchBox = page.getByPlaceholder('Buscar NFTs, artistas, coleções…')
    await searchBox.fill('Emerald')
    await searchBox.press('Enter')

    await expect(page).toHaveURL(/q=Emerald/)
    // Toda linha visível do grid precisa conter o termo buscado — sem isso, a busca não
    // estaria filtrando de verdade, só decorando a URL. Espera a rede assentar antes de
    // contar os cards: como a URL já mudou, o grid pode estar mostrando por um instante o
    // resultado anterior (keepPreviousData) antes do refetch filtrado chegar.
    await page.waitForLoadState('networkidle')
    const cardTitles = page.locator('[data-testid="nft-grid"] h3')
    await expect(cardTitles.first()).toContainText('Emerald', { ignoreCase: true })
    const count = await cardTitles.count()
    for (let i = 0; i < count; i++) {
      await expect(cardTitles.nth(i)).toContainText('Emerald', { ignoreCase: true })
    }
  })

  test('combinar filtro de rede com busca reinicia a paginação para a página 1', async ({ page }, testInfo) => {
    // A sidebar de filtros (categoria/rede/preço) é `hidden lg:block` (src/routes/index.tsx)
    // — no mobile ela vive dentro do painel aberto pelo botão central da barra inferior, sem
    // cobertura de teste dedicada ainda (ver ARCHITECTURE.md, "Limitações conhecidas").
    test.skip(testInfo.project.name === 'mobile-chromium', 'Sidebar de filtros é desktop-only — painel mobile ainda sem teste dedicado, ver ARCHITECTURE.md')

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
