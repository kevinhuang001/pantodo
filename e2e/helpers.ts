import type { Locator, Page } from '@playwright/test'
export async function choose(page: Page, trigger: Locator, value: string) {
  await trigger.click()
  await page.locator(`[role="option"][data-value="${value}"]`).click()
}
