// Ações reutilizadas entre specs — mantém cada arquivo de teste focado no que ele está
// verificando, em vez de repetir os mesmos passos de login/navegação em todo lugar.
import type { Page } from '@playwright/test'
import { COLLECTOR } from './credentials'

export async function login(page: Page, credentials = COLLECTOR) {
  await page.goto('/login')
  // Usa o id, não getByLabel('E-mail'): o rodapé (presente atrás do modal em toda rota, ver
  // __root.tsx) tem um campo de newsletter cujo rótulo acessível "Seu e-mail" também bate por
  // substring em getByLabel('E-mail'), causando ambiguidade (strict mode violation).
  await page.locator('#login-email').fill(credentials.email)
  await page.locator('#login-password').fill(credentials.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL((url) => url.pathname === '/')
}

/** Abre o primeiro NFT listado no catálogo e adiciona ao carrinho — usado como ponto de
 *  partida comum pelos testes de carrinho, pagamento e tempo real. Retorna o id do NFT
 *  (extraído do href do card) para quem precisar disparar um evento sobre ele. */
export async function addFirstNftToCart(page: Page): Promise<string> {
  await page.goto('/')
  // Escopado ao grid (data-testid="nft-grid"), não a qualquer `a[href^="/nft/"]` da página:
  // o banner "Explorar" do hero mobile (src/routes/index.tsx) também é um link para /nft/,
  // vem antes do grid no DOM, e no desktop fica só `display:none` (lg:hidden) — sem esse
  // escopo, `.first()` podia resolver pra ele e falhar o clique por elemento não visível.
  const firstNftLink = page.getByTestId('nft-grid').getByRole('link').first()
  const href = await firstNftLink.getAttribute('href')
  if (!href) throw new Error('Nenhum NFT encontrado no catálogo.')
  const nftId = href.split('/nft/')[1]

  await firstNftLink.click()
  await page.waitForURL(/\/nft\//)
  await page.getByRole('button', { name: 'Comprar' }).click()
  await page.waitForURL(/\/carrinho/)

  return nftId
}

export async function connectWallet(page: Page, label = 'MetaMask') {
  // `:visible` porque a tela de pagamento tem dois grupos de rádio de carteira no DOM ao
  // mesmo tempo (um para desktop, um para mobile — só um fica visível por vez via CSS), e os
  // dois têm um <label> com o mesmo texto de carteira.
  await page.locator(`label:has-text("${label}") input[type=radio]:visible`).click()
  await page.getByText('Conectada').first().waitFor()
}
