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

test('date and time controls only accept selection, including the Todo editor and manual records', async ({
  page,
}) => {
  await page.getByRole('button', { name: '安排时间', exact: true }).click()
  await expect(page.locator('.capture-schedule-picker input')).toHaveCount(0)
  await page.locator('[data-endpoint=start] button').nth(1).click()
  await expect(page.locator('.time-popover input')).toHaveCount(0)
  const hours = page.getByRole('listbox', { name: '小时', exact: true })
  await hours.getByRole('option', { name: '09', exact: true }).focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.locator('.clock-preview output')).toHaveText('10:00')
  await page.keyboard.type('22:35')
  await expect(page.locator('.clock-preview output')).toHaveText('10:00')
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await page.locator('.nav-row', { hasText: '全部任务' }).click()
  await page.locator('.task-body').first().click()
  await expect(page.locator('.datetime-field input')).toHaveCount(0)
  await page.locator('#task-start').click()
  await expect(page.locator('.date-popover')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await page.locator('.nav-row', { hasText: '时间统计' }).click()
  await page.getByRole('button', { name: '补录时间', exact: true }).click()
  await expect(page.locator('.datetime-field input')).toHaveCount(0)
  await page.locator('[data-datetime-field=entry-start] [data-part=time]').click()
  await expect(page.locator('.time-popover input')).toHaveCount(0)
})

test('accent colors tint both the content background and translucent navigation', async ({
  page,
}) => {
  const colors = async () => ({
    main: await page.locator('.main').evaluate((e) => getComputedStyle(e).backgroundColor),
    sidebar: await page.locator('.sidebar').evaluate((e) => getComputedStyle(e).backgroundImage),
  })
  const sage = await colors()
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.getByRole('button', { name: '海蓝', exact: true }).click()
  const ocean = await colors()
  expect(ocean.main).not.toBe(sage.main)
  expect(ocean.sidebar).not.toBe(sage.sidebar)
  await choose(page, page.getByRole('combobox', { name: '主题', exact: true }), 'dark')
  const darkOcean = await colors()
  await page.getByRole('button', { name: '琥珀', exact: true }).click()
  const darkAmber = await colors()
  expect(darkOcean.main).not.toBe(darkAmber.main)
  expect(darkOcean.sidebar).not.toBe(darkAmber.sidebar)
  expect(
    await page.locator('.sidebar').evaluate((e) => getComputedStyle(e).backdropFilter),
  ).toContain('blur')
})

test('panel gallery cards fit their content and do not reserve empty metadata or timing rows', async ({
  page,
}) => {
  await page.evaluate(() => {
    const w = JSON.parse(localStorage.getItem('pantodo.workspace.v2')!)
    const short = {
      ...w.tasks[0],
      id: 'compact-short',
      title: '短待办',
      notes: '',
      projectId: null,
      startAt: null,
      endAt: null,
      dueAt: null,
      estimateMinutes: null,
      status: 'doing',
    }
    const long = {
      ...short,
      id: 'compact-long',
      title: '内容较多的待办',
      notes: '这里是一段较长的说明。'.repeat(10),
    }
    w.tasks.push(short, long)
    w.taskTags[short.id] = []
    w.taskTags[long.id] = []
    const v = w.views.find((v: { id: string }) => v.id === 'view-workbench')
    v.panels[0].presentation = 'gallery'
    localStorage.setItem('pantodo.workspace.v2', JSON.stringify(w))
  })
  await page.goto('/')
  await page.locator('.nav-row', { hasText: '我的工作台' }).click()
  const short = page.locator('.task-gallery [data-task-id=compact-short]'),
    long = page.locator('.task-gallery [data-task-id=compact-long]')
  const shortBox = await short.boundingBox(),
    longBox = await long.boundingBox()
  expect(shortBox!.height).toBeLessThan(130)
  expect(longBox!.height).toBeGreaterThan(shortBox!.height + 25)
  await expect(short.locator('.task-timing')).toBeHidden()
  await expect(short.locator('.task-status,.task-start,.task-check,.task-actions')).toHaveCount(0)
  await short.locator('.task-body').click()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('panel task previews scroll within a capped region and keep the editor accessible', async ({
  page,
}) => {
  await page.evaluate(() => {
    const w = JSON.parse(localStorage.getItem('pantodo.workspace.v2')!)
    const template = w.tasks[0]
    for (let i = 0; i < 25; i++)
      w.tasks.push({
        ...template,
        id: 'scroll-' + i,
        title: '滚动任务 ' + i,
        notes: '完整任务说明 ' + i,
        status: 'doing',
      })
    const v = w.views.find((v: { id: string }) => v.id === 'view-workbench')
    v.panels[0].filter.statuses = ['doing']
    localStorage.setItem('pantodo.workspace.v2', JSON.stringify(w))
  })
  await page.goto('/')
  await page.locator('.nav-row', { hasText: '我的工作台' }).click()
  const region = page.locator('.panel-tasks').first()
  expect(await region.evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(true)
  expect((await region.boundingBox())!.height).toBeLessThanOrEqual(480)
  await expect(
    region.locator('.task-meta,.task-timing,.task-check,.task-actions,.task-start'),
  ).toHaveCount(0)
  const last = region.locator('.task-body').last()
  await last.scrollIntoViewIfNeeded()
  await last.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('sidebar has one search focus frame and Create follows the selected accent', async ({
  page,
}) => {
  await expect(page.locator('.sidebar-topline,.identity-text > span')).toHaveCount(0)
  const input = page.locator('#pantodo-search')
  await input.focus()
  await expect(input).toHaveCSS('outline-style', 'none')
  await expect(input).toHaveCSS('box-shadow', 'none')
  await expect(page.locator('.search')).toHaveCSS('outline-style', 'solid')
  const icon = page.locator('.primary-navigation .nav-row').first().locator('svg')
  const sage = await icon.evaluate((e) => getComputedStyle(e).backgroundColor)
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.getByRole('button', { name: '海蓝', exact: true }).click()
  expect(await icon.evaluate((e) => getComputedStyle(e).backgroundColor)).not.toBe(sage)
})
