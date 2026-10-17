import { test, expect } from '@playwright/test'
import { choose } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-17T09:00:00+08:00') })
  await page.goto('/?reset=1')
  await expect(page.locator('.capture-desk')).toBeVisible()
})

test('details grow and shrink with text, without manual resizing', async ({ page }) => {
  const notes = page.locator('.capture-notes')
  const initial = await notes.boundingBox()
  await notes.fill(Array.from({ length: 18 }, (_, i) => `第 ${i + 1} 行：工作记录`).join('\n'))
  const tall = await notes.boundingBox()
  expect(tall!.height).toBeGreaterThan(initial!.height + 200)
  expect(await notes.evaluate((e) => getComputedStyle(e).resize)).toBe('none')
  expect(await notes.evaluate((e) => e.scrollHeight <= e.clientHeight)).toBe(true)
  await notes.fill('一行')
  await expect.poll(async () => (await notes.boundingBox())!.height).toBe(initial!.height)
})

test('week picker highlights all seven visible days', async ({ page }) => {
  await page.locator('.nav-row', { hasText: '时间表' }).click()
  await page.locator('.calendar-range').click()
  const days = page.locator(
    '.date-popover button[data-range-start=true], .date-popover button[data-range-middle=true], .date-popover button[data-range-end=true]',
  )
  await expect(days).toHaveCount(7)
  for (let day = 12; day <= 18; day++)
    await expect(page.locator(`.date-popover button[data-day="2026/10/${day}"]`)).toHaveAttribute(
      'data-range-' + (day === 12 ? 'start' : day === 18 ? 'end' : 'middle'),
      'true',
    )
  await page.locator('.date-popover button[data-day="2026/10/22"]').click()
  await expect(page.locator('.calendar-range')).toContainText('19')
  await page.locator('.calendar-range').click()
  await expect(page.locator('.date-popover button[data-day="2026/10/19"]')).toHaveAttribute(
    'data-range-start',
    'true',
  )
})

test('completion can be cancelled and done titles have a line in list and gallery', async ({
  page,
}) => {
  await page.locator('.nav-row', { hasText: '全部任务' }).click()
  const first = page.locator('.task-row:not(.done)').first()
  const id = await first.getAttribute('data-task-id')
  const row = page.locator(`[data-task-id="${id}"]`)
  await row.getByRole('checkbox').click()
  await page.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click()
  await expect(row.getByRole('checkbox')).not.toBeChecked()
  await row.getByRole('checkbox').click()
  await page.getByRole('dialog').getByRole('button', { name: '完成', exact: true }).click()
  await expect(row.getByRole('checkbox')).toBeChecked()
  await expect(row.locator('.task-title')).toHaveCSS('text-decoration-line', 'line-through')
  await page
    .getByRole('group', { name: '展示方式' })
    .getByRole('button', { name: '画廊', exact: true })
    .click()
  await expect(row.locator('.task-title')).toHaveCSS('text-decoration-line', 'line-through')
  await row.getByRole('checkbox').click()
  await expect(row.getByRole('checkbox')).not.toBeChecked()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('accent presets persist in light and dark themes and trash belongs to scroll content', async ({
  page,
}) => {
  await expect(page.locator('.sidebar-scroll .sidebar-bottom-nav .nav-row')).toContainText('回收站')
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await expect(page.locator('.accent-choice')).toHaveCount(8)
  await page.getByRole('button', { name: '玫瑰', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-accent', 'rose')
  expect(
    await page
      .locator('html')
      .evaluate((e) => getComputedStyle(e).getPropertyValue('--accent').trim()),
  ).toBe('#ac5474')
  await choose(page, page.getByRole('combobox', { name: '主题', exact: true }), 'dark')
  expect(
    await page
      .locator('html')
      .evaluate((e) => getComputedStyle(e).getPropertyValue('--accent').trim()),
  ).toBe('#ec9cba')
  await page.keyboard.press('Escape')
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-accent', 'rose')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('dragging a narrow panel over a wide panel keeps content at its original size', async ({
  page,
}) => {
  await page.evaluate(() => {
    const workspace = JSON.parse(localStorage.getItem('pantodo.workspace.v2')!)
    const view = workspace.views.find((v: { id: string }) => v.id === 'view-workbench')
    view.panels[1].span = 2
    localStorage.setItem('pantodo.workspace.v2', JSON.stringify(workspace))
  })
  await page.goto('/')
  await page.locator('.nav-row', { hasText: '我的工作台' }).click()
  const panels = page.locator('.composed-panels > .composed-panel')
  const first = panels.nth(0),
    second = panels.nth(1)
  const original = await first.boundingBox(),
    handle = await first.locator('.panel-move').boundingBox(),
    destination = await second.locator('.panel-move').boundingBox()
  await page.mouse.move(handle!.x + 8, handle!.y + 8)
  await page.mouse.down()
  await page.mouse.move(handle!.x + 20, handle!.y + 8, { steps: 4 })
  await page.mouse.move(destination!.x + 8, destination!.y + 8, { steps: 12 })
  const overlay = page.locator('.panel-drag-overlay')
  await expect(overlay).toBeVisible()
  const size = await overlay.boundingBox()
  expect(size!.width).toBeCloseTo(original!.width, 0)
  expect(size!.height).toBeCloseTo(original!.height, 0)
  const transform = await second.evaluate((e) => getComputedStyle(e).transform)
  if (transform !== 'none') {
    const values = transform.slice(7, -1).split(',').map(Number)
    expect(values[0]).toBe(1)
    expect(values[3]).toBe(1)
  }
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await expect(overlay).toHaveCount(0)
})
