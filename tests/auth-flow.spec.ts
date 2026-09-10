// Cenário 3 do item 9: cadastro, login, expiração de sessão, logout e troca de usuário —
// com atenção especial a isolamento de dados entre contas (item 5 do desafio, eliminatório
// se quebrado: "exposição de dados entre usuários").
import { expect, test } from '@playwright/test'
import { ARTIST, COLLECTOR } from './support/credentials'

test.describe('Sessão e conta', () => {
  test('cadastro cria uma conta nova e autentica automaticamente', async ({ page }) => {
    const uniqueEmail = `teste.${Date.now()}@example.com`
    await page.goto('/cadastro')
    await page.getByPlaceholder('Nome de usuário').fill('Colecionador de Teste')
    await page.getByPlaceholder('Digite seu e-mail').fill(uniqueEmail)
    await page.getByPlaceholder('Senha', { exact: true }).fill('senha123')
    await page.getByPlaceholder('Confirmar senha').fill('senha123')
    await page.getByRole('button', { name: 'Criar conta' }).click()

    await page.waitForURL((url) => url.pathname === '/')
    // O nome só aparece ao lado do avatar em telas largas — no mobile, o avatar sozinho já
    // é a evidência de que a sessão ficou autenticada.
    await expect(page.getByRole('link', { name: 'Ver perfil' })).toBeVisible()
  })

  test('cadastro com e-mail já usado mostra erro de conflito', async ({ page }) => {
    await page.goto('/cadastro')
    await page.getByPlaceholder('Nome de usuário').fill('Outra Pessoa')
    await page.getByPlaceholder('Digite seu e-mail').fill(COLLECTOR.email)
    await page.getByPlaceholder('Senha', { exact: true }).fill('senha123')
    await page.getByPlaceholder('Confirmar senha').fill('senha123')
    await page.getByRole('button', { name: 'Criar conta' }).click()

    await expect(page.getByText('Este e-mail já está cadastrado.').first()).toBeVisible()
  })

  test('sessão expirada durante navegação redireciona para o login preservando o destino', async ({
    page,
  }) => {
    await page.goto('/login')
    await page.getByLabel('E-mail').fill(COLLECTOR.email)
    await page.locator('#login-password').fill(COLLECTOR.password)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.waitForURL((url) => url.pathname === '/')

    // Simula a sessão expirando "no servidor" — troca o token guardado por um inválido,
    // exatamente o que aconteceria se o token expirasse de verdade entre uma navegação e
    // outra.
    await page.evaluate(() => localStorage.setItem('nft-marketplace:session-token', 'token_invalido'))
    await page.goto('/perfil')

    await expect(page).toHaveURL(/\/login\?redirect=%2Fperfil/)
  })

  test('logout e login com outra conta não vazam favoritos entre usuários', async ({ page }) => {
    // Favorita um NFT como colecionadora — favoritar só existe na página de detalhe do NFT,
    // não no card da grade do catálogo (design-refs/Products.svg: o coração de favoritos
    // aparece apenas dentro do produto).
    await page.goto('/login')
    await page.getByLabel('E-mail').fill(COLLECTOR.email)
    await page.locator('#login-password').fill(COLLECTOR.password)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.waitForURL((url) => url.pathname === '/')
    await page.getByTestId('nft-grid').getByRole('link').first().click()
    await page.waitForURL(/\/nft\//)
    await page.getByRole('button', { name: 'Adicionar aos favoritos' }).click()
    await expect(page.getByRole('button', { name: 'Remover dos favoritos' })).toBeVisible()
    const nftUrl = page.url()

    // Logout e login como outro usuário — logout só limpa a sessão, não navega sozinho (o
    // usuário pode estar em qualquer página quando clica em "Sair"), então o sinal de que
    // terminou é o cabeçalho voltar a mostrar "Entrar", não uma mudança de URL.
    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible()
    await page.goto('/login')
    await page.getByLabel('E-mail').fill(ARTIST.email)
    await page.locator('#login-password').fill(ARTIST.password)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.waitForURL((url) => url.pathname === '/')

    // O mesmo NFT, para o novo usuário, não pode aparecer como favoritado.
    await page.goto(nftUrl)
    await expect(page.getByRole('button', { name: 'Adicionar aos favoritos' })).toBeVisible()
  })
})

test.describe('Favoritos', () => {
  test('falha ao favoritar reverte o coração para o estado anterior (rollback otimista)', async ({
    page,
  }) => {
    await page.goto('/login')
    await page.getByLabel('E-mail').fill(COLLECTOR.email)
    await page.locator('#login-password').fill(COLLECTOR.password)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.waitForURL((url) => url.pathname === '/')
    await page.getByTestId('nft-grid').getByRole('link').first().click()
    await page.waitForURL(/\/nft\//)

    // Força a próxima chamada de favoritos a falhar — simula uma falha transitória do
    // servidor sem depender de sorte ou de um cenário aleatório. page.route não intercepta de
    // forma confiável requisições que passam pelo service worker do MSW depois de uma
    // navegação (ver comentário no handler), por isso a falha é ligada por uma flag lida
    // pelo próprio handler, não por interceptação de rede.
    await page.evaluate(() => {
      ;(window as { __forceFavoriteFailure?: boolean }).__forceFavoriteFailure = true
    })

    const favoriteButton = page.getByRole('button', { name: 'Adicionar aos favoritos' })
    await favoriteButton.click()

    // Otimista: o coração preenche na hora...
    await expect(page.getByRole('button', { name: 'Remover dos favoritos' })).toBeVisible()
    // ...mas volta ao estado original assim que a falha chega (rollback).
    await expect(page.getByRole('button', { name: 'Adicionar aos favoritos' })).toBeVisible({
      timeout: 5_000,
    })
  })
})
