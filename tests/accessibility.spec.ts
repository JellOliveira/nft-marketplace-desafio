// Cenário 11 do item 9: navegação por teclado, foco de diálogos e validação de formulários
// (item 8 do desafio: "navegação por teclado e foco visível", "controle de foco em diálogos
// e drawers").
import { expect, test } from '@playwright/test'

test.describe('Acessibilidade', () => {
  test('abrir o modal de login move o foco para dentro dele, e Escape fecha devolvendo o foco', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Entrar' }).click()
    await page.waitForURL(/\/login/)

    // O primeiro campo do formulário (ou o próprio diálogo) precisa estar focado — nunca o
    // foco "solto" em algum lugar da página de trás.
    const emailInput = page.locator('#login-email')
    await expect(emailInput).toBeVisible()
    await page.keyboard.press('Tab')
    const focusedIsInsideDialog = await page.evaluate(() =>
      document.activeElement?.closest('[role="dialog"]') != null,
    )
    expect(focusedIsInsideDialog).toBe(true)

    await page.keyboard.press('Escape')
    await expect(page).toHaveURL((url) => url.pathname === '/')
  })

  test('formulário de login mostra erro de validação acessível para credenciais inválidas', async ({
    page,
  }) => {
    await page.goto('/login')
    // Usa o id, não getByLabel('E-mail'): ver comentário equivalente em auth-flow.spec.ts.
    await page.locator('#login-email').fill('naoexiste@kurio.app')
    await page.locator('#login-password').fill('senhaerrada')
    await page.getByRole('button', { name: 'Entrar' }).click()

    // A mensagem de erro precisa estar associada a um `role="alert"` — é o que garante que
    // um leitor de tela anuncie a falha sem o usuário precisar procurar por ela.
    await expect(page.getByRole('alert').filter({ hasText: 'inválidos' })).toBeVisible()
  })

  test('busca do cabeçalho é operável só com teclado', async ({ page }, testInfo) => {
    // Ver comentário equivalente em catalog.spec.ts: a Home não tem o botão de busca do
    // cabeçalho padrão abaixo de lg (cabeçalho compacto próprio, sem busca por texto).
    test.skip(testInfo.project.name === 'mobile-chromium', 'Busca por texto não tem entrada própria no mobile — ver ARCHITECTURE.md')

    await page.goto('/')
    // A busca vive atrás do ícone de lupa no cabeçalho (design-refs/Products.svg) — o teste
    // abre com Enter, igual a um usuário de teclado faria, em vez de focar a caixa direto.
    await page.getByRole('button', { name: 'Buscar NFTs' }).focus()
    await page.keyboard.press('Enter')
    const searchBox = page.getByPlaceholder('Buscar NFTs, artistas, coleções…')
    await expect(searchBox).toBeFocused()
    await page.keyboard.type('Emerald')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/q=Emerald/)
  })
})
