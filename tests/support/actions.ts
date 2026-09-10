// Ações reutilizadas entre specs — mantém cada arquivo de teste focado no que ele está
// verificando, em vez de repetir os mesmos passos de login/navegação em todo lugar.
import type { Page } from '@playwright/test'
import { COLLECTOR } from './credentials'

export async function login(page: Page, credentials = COLLECTOR) {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(credentials.email)
  await page.locator('#login-password').fill(credentials.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL((url) => url.pathname === '/')
}

/** Abre o primeiro NFT listado no catálogo e adiciona ao carrinho — usado como ponto de
 *  partida comum pelos testes de carrinho, pagamento e tempo real. Retorna o id do NFT
 *  (extraído do href do card) para quem precisar disparar um evento sobre ele. */
export async function addFirstNftToCart(page: Page): Promise<string> {
  await page.goto('/')
  const href = await page.locator('a[href^="/nft/"]').first().getAttribute('href')
  if (!href) throw new Error('Nenhum NFT encontrado no catálogo.')
  const nftId = href.split('/nft/')[1]

  await page.locator(`a[href="${href}"]`).click()
  await page.waitForURL(/\/nft\//)
  await page.getByRole('button', { name: 'Comprar' }).click()
  await page.waitForURL(/\/carrinho/)

  return nftId
}

export async function connectWallet(page: Page, label = 'MetaMask') {
  await page.locator(`label:has-text("${label}") input[type=radio]`).click()
  await page.getByText('Conectada').waitFor()
}
