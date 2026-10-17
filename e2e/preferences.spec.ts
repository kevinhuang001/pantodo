import { test, expect } from '@playwright/test'
import { choose } from './helpers'
test.beforeEach(async ({ page }) => {
  await page.goto('/?reset=1')
  await expect(page.locator('.capture-desk')).toBeVisible()
})
test('new preferences persist and change startup, default planning and focus behavior', async ({
  page,
}) => {
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await expect(
    page.locator('.settings-nav').getByRole('button', { name: '数据', exact: true }),
  ).toHaveCount(0)
  await choose(page, page.getByRole('combobox', { name: '默认计划时长', exact: true }), '60')
  await choose(page, page.getByRole('combobox', { name: '启动时打开', exact: true }), 'all')
  await page.locator('.settings-nav').getByRole('button', { name: '计时', exact: true }).click()
  await page.getByRole('checkbox', { name: '自动进入专注', exact: true }).uncheck()
  await page.locator('.settings-footer button').click()
  await page.goto('/')
  await expect(page.locator('.nav-row.active')).toContainText('全部任务')
  await page.locator('.task-start').first().click()
  await expect(page.locator('.work-timer')).toBeVisible()
  await expect(page.locator('.focus-screen')).toHaveCount(0)
  await page.locator('.nav-row', { hasText: '创建' }).click()
  await page.getByRole('button', { name: '安排时间', exact: true }).click()
  await expect(page.getByRole('button', { name: '计划时长', exact: true })).toContainText('1小时')
})
test('list and gallery have distinct panel layouts without filter summaries', async ({ page }) => {
  await page.locator('.nav-row', { hasText: '我的工作台' }).click()
  const panel = page.locator('.composed-panel').nth(1)
  await expect(panel.locator('.panel-meta')).toHaveCount(0)
  await expect(panel.locator('.task-list')).toHaveCSS('display', 'flex')
  await panel.getByRole('button', { name: '画廊', exact: true }).click()
  await expect(panel.locator('.task-gallery')).toHaveCSS('display', 'grid')
  const columns = await panel
    .locator('.task-gallery')
    .evaluate((e) => getComputedStyle(e).gridTemplateColumns)
  expect(columns.split(' ').length).toBe(2)
  await page.setViewportSize({ width: 800, height: 650 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
test('ECharts render six reports and respond to theme and panel resizing', async ({ page }) => {
  await page.locator('.nav-row', { hasText: '时间统计' }).click()
  await expect(page.locator('.echart')).toHaveCount(6)
  await expect(page.locator('.echart svg')).toHaveCount(6)
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.locator('.settings-nav').getByRole('button', { name: '统计', exact: true }).click()
  await choose(page, page.getByRole('combobox', { name: '每日专注目标', exact: true }), '240')
  await choose(page, page.getByRole('combobox', { name: '默认统计周期', exact: true }), 'month')
  await page.locator('.settings-footer button').click()
  await page.locator('.nav-row', { hasText: '创建' }).click()
  await page.locator('.nav-row', { hasText: '时间统计' }).click()
  await expect(page.getByRole('button', { name: '本月', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.locator('.echart').last()).toContainText('240')
  await page.setViewportSize({ width: 900, height: 700 })
  await expect(page.locator('.echart svg')).toHaveCount(6)
})

test('day and week use matching date columns and deadlines never cover planned blocks', async ({
  page,
}) => {
  await page.locator('.nav-row', { hasText: '时间表' }).click()
  const modes = page.locator('.calendar-mode')
  for (const [mode, count] of [
    ['周', 7],
    ['日', 1],
  ] as const) {
    await modes.getByRole('button', { name: mode, exact: true }).click()
    await expect(page.locator('.tt-column')).toHaveCount(count)
    const heads = await page.locator('.tt-day-head').all(),
      columns = await page.locator('.tt-column').all()
    for (let i = 0; i < count; i++) {
      const a = await heads[i]!.boundingBox(),
        b = await columns[i]!.boundingBox()
      expect(Math.abs(a!.x - b!.x)).toBeLessThan(1)
      expect(Math.abs(a!.width - b!.width)).toBeLessThan(1)
    }
    if (count === 1) {
      const column = await columns[0]!.boundingBox(),
        body = await page.locator('.tt-body').boundingBox()
      expect(column!.width).toBeGreaterThan(body!.width * 0.85)
    }
  }
  const block = await page.locator('.tt-block', { hasText: '回复客户邮件' }).boundingBox()
  const deadline = await page.locator('.deadline-label', { hasText: '回复客户邮件' }).boundingBox()
  expect(block).not.toBeNull()
  expect(deadline).not.toBeNull()
  expect(
    Math.min(block!.x + block!.width, deadline!.x + deadline!.width) -
      Math.max(block!.x, deadline!.x),
  ).toBeLessThanOrEqual(0)
})
