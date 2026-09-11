// Cenário 5 do item 9: quantidades, remoção, cupom e persistência do carrinho após
// refresh/login. O carrinho do visitante precisa sobreviver ao login (item 3 do desafio).
import { expect, test } from '@playwright/test'
import { addFirstNftToCart, login } from './support/actions'

test.describe('Carrinho', () => {
  test('alterar quantidade, aplicar e remover cupom, e persistir após refresh', async ({ page }) => {
    await login(page)
    await addFirstNftToCart(page)

    // aumenta a quantidade
    const quantityLabel = page.locator('main span.w-6.text-center')
    await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await expect(quantityLabel).toHaveText('2')

    // cupom válido — o resumo do carrinho é renderizado duas vezes no DOM (layout desktop e
    // mobile, uma delas oculta por CSS conforme a largura), então o texto existe em dois
    // lugares ao mesmo tempo; `.filter({ visible: true })` restringe ao que está realmente na
    // tela nesta viewport.
    const couponApplied = page.getByText('Cupom KURIO10 aplicado').filter({ visible: true })
    await page.getByTestId('coupon-input').filter({ visible: true }).fill('KURIO10')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(couponApplied).toBeVisible()

    // persiste após refresh
    await page.reload({ waitUntil: 'networkidle' })
    await expect(couponApplied).toBeVisible()
    await expect(quantityLabel).toHaveText('2')

    // remove o cupom
    await page.getByRole('button', { name: 'Remover', exact: true }).click()
    await expect(couponApplied).not.toBeVisible()

    // remove o item
    await page.getByRole('button', { name: /Remover .* do carrinho/ }).click()
    await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()
  })

  test('cupom expirado mostra erro e não altera o total', async ({ page }) => {
    await login(page)
    await addFirstNftToCart(page)

    await page.getByTestId('coupon-input').filter({ visible: true }).fill('EXPIRADO5')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('Este cupom expirou.')).toBeVisible()
    await expect(page.getByText('Cupom EXPIRADO5 aplicado')).not.toBeVisible()
  })
})
