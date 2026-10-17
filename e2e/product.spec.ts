import { selectClockTime, selectDuration } from '../scripts/date-fixture.mjs'
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
  await page.locator('em-emoji-picker input[type=search]').fill('microscope')
  const popup = await page.locator('.emoji-popover').boundingBox()
  expect(popup!.y).toBeGreaterThanOrEqual(12)
  expect(popup!.y + popup!.height).toBeLessThanOrEqual(page.viewportSize()!.height - 11)
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
  await expect(page.getByRole('option', { selected: true })).toBeFocused()
  await page.keyboard.press('End')
  await expect(page.getByRole('option').last()).toBeFocused()
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

test('capture selectors open on demand and the end starts from the selected start', async ({
  page,
}) => {
  const trigger = page.getByRole('button', { name: '安排时间', exact: true })
  await trigger.click()
  await expect(page.locator('[data-slot="calendar"]')).toHaveCount(0)
  const start = page.locator('[data-endpoint="start"]'),
    end = page.locator('[data-endpoint="end"]')
  await start.locator('button').nth(0).click()
  const popup = page.locator('.date-popover')
  const bounds = await popup.boundingBox(),
    calendar = await popup.locator('[data-slot="calendar"]').boundingBox()
  expect(bounds!.width - calendar!.width).toBeLessThanOrEqual(2)
  await popup.locator('button[data-day="2026/10/20"]').click()
  await start.locator('button').nth(1).click()
  await selectClockTime(page, '23:45')
  await end.locator('button').nth(0).click()
  await expect(page.locator('.date-popover button[data-day="2026/10/20"]')).toHaveAttribute(
    'data-selected-single',
    'true',
  )
  await page.locator('.date-popover button[data-day="2026/10/21"]').click()
  await end.locator('button').nth(1).click()
  await expect(page.locator('.clock-preview output')).toHaveText('23:45')
  await selectClockTime(page, '00:15')
  await page
    .locator('.capture-schedule-picker')
    .getByRole('button', { name: '完成', exact: true })
    .click()
  await expect(trigger).toBeFocused()
  await expect(trigger).toContainText('10月20日')
})

test('capture estimate offers quick durations and a custom value', async ({ page }) => {
  const trigger = page.getByRole('button', { name: '预估时长', exact: true })
  await trigger.click()
  await page.getByRole('button', { name: '45分', exact: true }).click()
  await expect(trigger).toContainText('45分')
  await trigger.click()
  await expect(
    page.locator('.duration-custom').getByRole('combobox', { name: '小时', exact: true }),
  ).toHaveText('0')
  await selectDuration(page, '95')
  await expect(trigger).toContainText('1小时35分')
})
