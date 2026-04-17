import { expect, test } from '@playwright/test'

test('redirects protected kanban route to login when unauthenticated', async ({ page }) => {
  await page.goto('/kanban')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible()
})

test('google login flow replaces login history entry so back returns to previous page', async ({ page, baseURL }) => {
  await page.route('**/api/auth/providers', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        google: {
          id: 'google',
          name: 'Google',
          type: 'oauth',
          signinUrl: `${baseURL}/api/auth/signin/google`,
          callbackUrl: `${baseURL}/api/auth/callback/google`,
        },
      }),
    })
  })

  await page.route('**/api/auth/csrf', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ csrfToken: 'test-csrf-token' }),
    })
  })

  await page.route('**/api/auth/signin/google**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ url: `${baseURL}/today` }),
    })
  })

  await page.route('**/today', async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><body><main><h1>Today Mock</h1></main></body></html>',
    })
  })

  await page.goto('/status')
  await expect(page).toHaveURL(/\/status$/)

  await page.goto('/login')
  await page.getByRole('button', { name: 'Continuar con Google' }).click()

  await expect(page).toHaveURL(/\/today$/)
  await expect(page.getByText('Today Mock')).toBeVisible()

  await page.goBack()
  await expect(page).toHaveURL(/\/status$/)
})
