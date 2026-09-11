// Regressão visual (item 9 do desafio): Início, Detalhe, Carrinho e Pagamento, com baselines
// versionadas. Roda nos dois projetos definidos em playwright.config.ts (desktop 1440x900 e
// mobile), então cada tela já cobre os dois breakpoints exigidos pelo item 8 sem duplicação
// aqui. Estado isolado por teste (contexto novo do Playwright = localStorage limpo, ver
// ARCHITECTURE.md) e catálogo gerado por seed fixa (src/mocks/data/nfts.ts) — mesmo conteúdo
// visual em toda execução, sem depender do temporizador ambiente (desligado em .env.test).
//
// Limitação conhecida: as baselines deste repositório foram geradas no Windows 11 + Chromium
// (via Playwright). Renderização de fonte varia entre sistemas operacionais, então uma
// primeira execução em Linux/macOS pode acusar diferença mesmo sem nenhuma mudança real de
// layout — por isso `maxDiffPixelRatio` (ver playwright.config.ts) tolera até 5% de pixels
// divergentes antes de falhar. Se isso não for suficiente na máquina do avaliador, o diff
// gerado (playwright-report/) mostra exatamente a região divergente; regenerar as baselines
// nessa máquina com `npx playwright test --update-snapshots` resolve de vez.
import { expect, test } from '@playwright/test'
import { addFirstNftToCart, connectWallet, login } from './support/actions'

// Aplicado antes de cada screenshot: para o cursor de piscar em inputs focados e neutraliza
// qualquer transição/animação CSS residual (além de `animations: 'disabled'` já cobrir
// transform/opacity, isso cobre casos com `transition` em outras propriedades).
async function freezeUi(page: import('@playwright/test').Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        transition-duration: 0s !important;
        animation-duration: 0s !important;
        caret-color: transparent !important;
      }
    `,
  })
}

test.describe('Regressão visual', () => {
  test('Início', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await freezeUi(page)
    await expect(page).toHaveScreenshot('inicio.png', { fullPage: true })
  })

  test('Detalhe do NFT', async ({ page }) => {
    await page.goto('/')
    const firstNftLink = page.locator('a[href^="/nft/"]').first()
    const href = await firstNftLink.getAttribute('href')
    await page.goto(href!)
    await page.waitForLoadState('networkidle')
    await freezeUi(page)
    await expect(page).toHaveScreenshot('detalhe-nft.png', { fullPage: true })
  })

  test('Carrinho', async ({ page }) => {
    await addFirstNftToCart(page)
    await page.waitForLoadState('networkidle')
    await freezeUi(page)
    await expect(page).toHaveScreenshot('carrinho.png', { fullPage: true })
  })

  test('Pagamento', async ({ page }) => {
    await login(page)
    await addFirstNftToCart(page)
    await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
    await page.waitForURL(/\/pagamento/)
    await connectWallet(page, 'MetaMask')
    await page.waitForLoadState('networkidle')
    await freezeUi(page)
    await expect(page).toHaveScreenshot('pagamento.png', { fullPage: true })
  })
})
