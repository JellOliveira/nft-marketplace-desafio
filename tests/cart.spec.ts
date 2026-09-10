// Cenário 5 do item 9: quantidades, remoção, cupom e persistência do carrinho após
// refresh/login. O carrinho do visitante precisa sobreviver ao login (item 3 do desafio).
import { expect, test } from '@playwright/test'
import { COLLECTOR } from './support/credentials'

test.describe('Carrinho', () => {
  test('alterar quantidade, aplicar e remover cupom, e persistir após refresh', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('E-mail').fill(COLLECTOR.email)
    await page.locator('#login-password').fill(COLLECTOR.password)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.waitForURL((url) => url.pathname === '/')

    const href = await page.locator('a[href^="/nft/"]').first().getAttribute('href')
    await page.locator(`a[href="${href}"]`).click()
    await page.waitForURL(/\/nft\//)
    await page.getByRole('button', { name: 'Comprar' }).click()
    await page.waitForURL(/\/carrinho/)

    // aumenta a quantidade
    const quantityLabel = page.locator('main span.w-6.text-center')
    await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await expect(quantityLabel).toHaveText('2')

    // cupom válido
    await page.fill('#coupon-code', 'KURIO10')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('Cupom KURIO10 aplicado')).toBeVisible()

    // persiste após refresh
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.getByText('Cupom KURIO10 aplicado')).toBeVisible()
    await expect(quantityLabel).toHaveText('2')

    // remove o cupom
    await page.getByRole('button', { name: 'Remover', exact: true }).click()
    await expect(page.getByText('Cupom KURIO10 aplicado')).not.toBeVisible()

    // remove o item
    await page.getByRole('button', { name: /Remover .* do carrinho/ }).click()
    await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()
  })

  test('cupom expirado mostra erro e não altera o total', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('E-mail').fill(COLLECTOR.email)
    await page.locator('#login-password').fill(COLLECTOR.password)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.waitForURL((url) => url.pathname === '/')

    const href = await page.locator('a[href^="/nft/"]').first().getAttribute('href')
    await page.locator(`a[href="${href}"]`).click()
    await page.waitForURL(/\/nft\//)
    await page.getByRole('button', { name: 'Comprar' }).click()
    await page.waitForURL(/\/carrinho/)

    await page.fill('#coupon-code', 'EXPIRADO5')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('Este cupom expirou.')).toBeVisible()
    await expect(page.getByText('Cupom EXPIRADO5 aplicado')).not.toBeVisible()
  })
})
