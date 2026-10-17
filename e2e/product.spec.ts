import { test, expect } from '@playwright/test'
import { choose } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-19T09:00:00+08:00') })
  await page.goto('/?reset=1')
  await expect(page.locator('.capture-desk')).toBeVisible()
})

test('view creation contains only identity fields and supports cancelling an emoji popover', async ({
  page,
}) => {
  await page.getByRole('button', { name: '新建视图', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.locator('input:not([type="hidden"])')).toHaveCount(1)
  await expect(dialog.getByRole('combobox')).toHaveCount(0)
  await page.locator('#view-name').fill('论文进度')
  await page.locator('.emoji-trigger').click()
  await page.getByRole('textbox', { name: '搜索图标…', exact: true }).fill('research')
  await page.getByRole('button', { name: '🔬', exact: true }).click()
  await page.locator('button[form="pantodo-view-form"]').click()
  await expect(page.locator('.toolbar h1')).toContainText('论文进度')
  await expect(page.locator('.composed-panel')).toHaveCount(0)
  await page.getByRole('button', { name: '添加面板', exact: true }).click()
  await page.locator('#panel-name').fill('实验')
  await page.locator('.emoji-trigger').click()
  await page.keyboard.press('Escape')
  await expect(page.locator('#panel-name')).toHaveValue('实验')
  await page.locator('button[form="panel-form"]').click()
  await expect(page.locator('.composed-panel')).toHaveCount(1)
})

test('select menus support keyboard selection and return focus to the trigger', async ({
  page,
}) => {
  await page.getByRole('button', { name: '设置', exact: true }).click()
  const theme = page.getByRole('combobox', { name: '主题', exact: true })
  await theme.focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('listbox')).toBeVisible()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(theme).toBeFocused()
  await choose(page, theme, 'light')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('three second focus transition is automatic, can be cancelled and never requests OS fullscreen', async ({
  page,
}) => {
  await page.locator('.nav-row', { hasText: '全部任务' }).click()
  await page.evaluate(() => {
    document.documentElement.requestFullscreen = () => {
      throw new Error('OS fullscreen must not be called')
    }
  })
  await page.locator('.task-start').first().click()
  await expect(page.locator('.focus-countdown output')).toHaveText('3')
  await page.clock.runFor(1000)
  await expect(page.locator('.focus-countdown output')).toHaveText('2')
  await page.clock.runFor(1000)
  await expect(page.locator('.focus-countdown output')).toHaveText('1')
  await expect(page.locator('.focus-clock')).toHaveCount(0)
  await page.clock.runFor(1000)
  await expect(page.locator('.focus-clock')).toBeVisible()
  await expect(page.locator('.sidebar')).toBeVisible()
  const pane = await page.locator('.main').boundingBox(),
    focus = await page.locator('.focus-screen').boundingBox()
  expect(focus!.x).toBe(pane!.x)
  expect(focus!.width).toBe(pane!.width)
  expect(focus!.y + focus!.height).toBe(pane!.y + pane!.height)
  await page.locator('.focus-exit').click()
  await page.locator('.work-timer').getByRole('button', { name: '停止并保存', exact: true }).click()
  await page.locator('.task-start').first().click()
  await page.locator('.focus-countdown').getByRole('button', { name: '取消', exact: true }).click()
  await page.clock.runFor(4000)
  await expect(page.locator('.focus-screen')).toHaveCount(0)
  await expect(page.locator('.work-timer')).toBeVisible()
})

test('in-app calendar selects a date without a native date input', async ({ page }) => {
  await page.getByRole('button', { name: '时间与预估', exact: true }).click()
  await page.locator('#create-start').fill('2026-10-19T10:00')
  await page.locator('#create-start').locator('..').getByRole('button').click()
  await expect(page.locator('[data-slot="calendar"]')).toBeVisible()
  await page.locator('[data-slot="calendar"] button[data-day]').filter({ hasText: /^20$/ }).click()
  await expect(page.locator('#create-start')).toHaveValue('2026-10-20T10:00')
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-slot="calendar"]')).toHaveCount(0)
  await expect(page.locator('#create-start').locator('..').getByRole('button')).toBeFocused()
})
