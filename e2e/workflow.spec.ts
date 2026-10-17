import { selectDuration, setDateTimeField } from '../scripts/date-fixture.mjs'
import { setCaptureSchedule } from '../scripts/capture-fixture.mjs'
import { choose } from './helpers'
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { Workspace } from '../src/domain/types'
const FIXED = new Date('2026-10-19T09:00:00+08:00')
const read = async (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('pantodo.workspace.v2')!) as Workspace)
async function stats(page: Page) {
  await page.locator('.nav-row', { hasText: '时间统计' }).click()
}
async function manual(page: Page, start: string, end: string, note: string, taskId = '') {
  await page.getByRole('button', { name: '补录时间', exact: true }).click()
  await choose(page, page.locator('#entry-task'), taskId)
  await setDateTimeField(page, 'entry-start', start)
  await setDateTimeField(page, 'entry-end', end)
  await page.locator('#entry-note').fill(note)
  await page.locator('button[form="time-entry-form"]').click()
  await expect(page.locator('#time-entry-form')).toHaveCount(0)
}
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: FIXED })
  await page.goto('/?reset=1')
  await expect(page.locator('.capture-desk')).toBeVisible()
})

test('creates a planned Todo with an independent deadline marker and edits it from the calendar', async ({
  page,
}) => {
  await page.locator('#pantodo-inbox-input').fill('准备实验报告')
  await setCaptureSchedule(page, {
    start: '2026-10-19T10:00',
    end: '2026-10-19T11:30',
    due: '2026-10-19T16:00',
    estimate: '90',
  })
  await page.getByRole('button', { name: '记下来', exact: true }).click()
  await expect(page.locator('#pantodo-inbox-input')).toHaveValue('')
  const todo = (await read(page)).tasks.find((task) => task.title === '准备实验报告')!
  expect(todo.startAt).toBe('2026-10-19T02:00:00.000Z')
  expect(todo.endAt).toBe('2026-10-19T03:30:00.000Z')
  await page.locator('.nav-row', { hasText: '时间表' }).click()
  await expect(page.locator(`[data-todo-id="${todo.id}"]`)).toHaveCount(1)
  const line = page.locator('.deadline-label', { hasText: '准备实验报告' })
  await expect(line).toContainText('16:00')
  await line.click()
  await page.locator('#task-title').fill('准备实验报告（已调整）')
  await setDateTimeField(page, 'task-start', '2026-10-19T12:00')
  await page.getByRole('button', { name: '持续时间', exact: true }).click()
  await selectDuration(page, '60')
  await page.locator('button[form="pantodo-task-form"]').click()
  await expect(page.locator(`[data-todo-id="${todo.id}"]`)).toContainText('12:00')
})

test('a deadline-only Todo appears as a thin marker without a plan block', async ({ page }) => {
  await page.locator('#pantodo-inbox-input').fill('只设置交付期限')
  await setCaptureSchedule(page, { due: '2026-10-19T15:00' })
  await page.getByRole('button', { name: '记下来', exact: true }).click()
  const task = (await read(page)).tasks.find((task) => task.title === '只设置交付期限')!
  await page.locator('.nav-row', { hasText: '时间表' }).click()
  await expect(page.locator('.deadline-label', { hasText: task.title })).toHaveCount(1)
  await expect(page.locator(`[data-todo-id="${task.id}"]`)).toHaveCount(0)
})

test('calendar supports day, week, month and drag-only zoom', async ({ page }) => {
  await page.locator('.nav-row', { hasText: '时间表' }).click()
  const mode = page.getByRole('group', { name: '时间表视图', exact: true })
  await expect(page.locator('.tt-column')).toHaveCount(7)
  await mode.getByRole('button', { name: '日', exact: true }).click()
  await expect(page.locator('.tt-column')).toHaveCount(1)
  const zoom = page.getByRole('slider', { name: '时间表缩放' })
  await zoom.focus()
  await zoom.press('End')
  await expect(page.locator('.tt-body')).toHaveAttribute('style', /3456px/)
  await mode.getByRole('button', { name: '月', exact: true }).click()
  await expect(page.locator('.month-day')).toHaveCount(42)
  await expect(page.locator('.month-event.deadline-event').first()).toBeVisible()
  await expect(mode.getByRole('button')).toHaveCount(3)
  await expect(page.locator('.calendar-subbar,.calendar-agenda')).toHaveCount(0)
  expect((await page.locator('.calendar-controls').boundingBox())!.height).toBeLessThanOrEqual(48)
})

test('pause excludes break time, stop saves records and completed Todos stop timers', async ({
  page,
}) => {
  await page.locator('.nav-row', { hasText: '全部任务' }).click()
  const id = await page.locator('.task-row').first().getAttribute('data-task-id')
  const row = page.locator(`[data-task-id="${id}"]`)
  await row.getByRole('button', { name: '开始工作', exact: true }).click()
  await page.clock.runFor(20_000)
  await page.locator('.focus-exit').click()
  await page.locator('.work-timer').getByRole('button', { name: '暂停', exact: true }).click()
  await expect(page.locator('.timer-clock')).toHaveText('00:00:20')
  await page.clock.runFor(60_000)
  await expect(page.locator('.timer-clock')).toHaveText('00:00:20')
  await page.locator('.work-timer').getByRole('button', { name: '继续', exact: true }).click()
  await page.clock.runFor(10_000)
  await row.locator('.task-check').click()
  await page.getByRole('dialog').getByRole('button', { name: '完成', exact: true }).click()
  await expect(page.locator('.work-timer')).toHaveCount(0)
  const entries = (await read(page)).timeEntries.filter((entry) => !entry.deletedAt)
  const seconds = entries.reduce(
    (sum, e) => sum + (Date.parse(e.endedAt) - Date.parse(e.startedAt)) / 1000,
    0,
  )
  expect(seconds).toBeGreaterThanOrEqual(30)
  expect(seconds).toBeLessThan(31)
})

test('reload stops the timer, and a heartbeat gap never adds sleep time', async ({ page }) => {
  await page.locator('.nav-row', { hasText: '全部任务' }).click()
  await page.locator('.task-start').first().click()
  await page.clock.runFor(8000)
  await page.goto('/')
  await expect(page.locator('.capture-desk')).toBeVisible()
  expect((await read(page)).timer).toBeNull()
  await page.locator('.nav-row', { hasText: '全部任务' }).click()
  await page.locator('.task-start').first().click()
  await page.clock.runFor(6000)
  const before = (await read(page)).timer!.lastHeartbeatAt
  await page.clock.setSystemTime(new Date(FIXED.getTime() + 600_000))
  await page.clock.runFor(5000)
  expect((await read(page)).timer).toBeNull()
  const latest = (await read(page)).timeEntries.at(-1)!
  expect(latest.endedAt).toBe(before)
})

test('manual entries wholly replace overlaps, persist and remain editable', async ({ page }) => {
  await stats(page)
  await manual(page, '2026-10-18T10:00', '2026-10-18T12:00', '旧记录')
  await manual(page, '2026-10-18T10:30', '2026-10-18T11:00', '新补录优先')
  await expect(page.getByTestId('stats-total')).toHaveText('30m')
  let state = await read(page)
  expect(state.timeEntries.filter((entry) => !entry.deletedAt)).toHaveLength(1)
  expect(state.timeEntries.find((entry) => entry.deletedAt)?.supersededBy).toBe(
    state.timeEntries.find((entry) => !entry.deletedAt)?.id,
  )
  await page.getByRole('button', { name: '编辑时间记录', exact: true }).click()
  await setDateTimeField(page, 'entry-end', '2026-10-18T11:30')
  await page.locator('button[form="time-entry-form"]').click()
  await expect(page.getByTestId('stats-total')).toHaveText('1h')
  await page.goto('/')
  await stats(page)
  await expect(page.getByTestId('stats-total')).toHaveText('1h')
  state = await read(page)
  expect(state.timeEntries.filter((e) => !e.deletedAt)).toHaveLength(1)
})

test('multiple tag filters deduplicate totals and each tag receives full time', async ({
  page,
}) => {
  const initial = await read(page),
    task = initial.tasks.find((task) => task.title.startsWith('设计评审'))!
  await stats(page)
  await manual(page, '2026-10-18T10:00', '2026-10-18T11:00', '带多个标签', task.id)
  await page.locator('.stats-tag-picker').click()
  await page.locator('.stats-tag-menu').getByLabel('重要', { exact: true }).click()
  await page.locator('.stats-tag-menu').getByLabel('紧急', { exact: true }).click()
  await page.locator('.stats-tag-picker').click()
  await expect(page.getByTestId('stats-total')).toHaveText('1h')
  await page.locator('.category-head').getByRole('button', { name: '按标签', exact: true }).click()
  await expect(page.locator('.category-row', { hasText: '重要' })).toContainText('1h')
  await expect(page.locator('.category-row', { hasText: '紧急' })).toContainText('1h')
})

test('projects and saved views support emoji', async ({ page }) => {
  await page.getByRole('button', { name: '新建项目', exact: true }).click()
  await page.locator('#entity-name').fill('实验项目')
  await page.locator('.emoji-trigger').click()
  await page.locator('em-emoji-picker input[type=search]').fill('test tube')
  await page.getByRole('button', { name: '🧪', exact: true }).click()
  await page.locator('button[form="pantodo-entity-form"]').click()
  await expect(page.locator('.nav-row', { hasText: '实验项目' }).locator('.nav-emoji')).toHaveText(
    '🧪',
  )
  await page.getByRole('button', { name: '新建视图', exact: true }).click()
  await page.locator('#view-name').fill('实验面板')
  await page.locator('.emoji-trigger').click()
  await page.locator('em-emoji-picker input[type=search]').fill('rocket')
  await page.getByRole('button', { name: '🚀', exact: true }).click()
  await page.locator('button[form="pantodo-view-form"]').click()
  await expect(page.locator('.nav-row.active')).toContainText('实验面板')
  await expect(page.locator('.nav-row.active .nav-emoji')).toHaveText('🚀')
  await expect(page.locator('.composed-panel')).toHaveCount(0)
})

test('panel filters, width and order persist without Todo dragging', async ({ page }) => {
  await page.locator('.nav-row', { hasText: '我的工作台' }).click()
  await page.getByRole('button', { name: '添加面板', exact: true }).click()
  await page.locator('#panel-name').fill('紧急待办')
  await page.getByRole('dialog').getByRole('button', { name: '紧急', exact: true }).first().click()
  await choose(page, page.locator('#panel-span'), '2')
  await page.locator('button[form="panel-form"]').click()
  const panel = page.locator('.composed-panel', {
    has: page.getByRole('heading', { name: '紧急待办', exact: true }),
  })
  await expect(panel.locator('.task-row')).toHaveCount(2)
  await expect(panel).toHaveCSS('--panel-span', '2')
  const firstId = await page.locator('.composed-panel').first().getAttribute('data-panel-id')
  await page.locator('.composed-panel').first().locator('.panel-move').focus()
  await page.keyboard.press('Space')
  await expect(page.locator('.composed-panel').first()).toHaveAttribute('data-dragging', 'true')
  // dnd-kit attaches its keyboard listener in a zero-delay timer after activation; let React
  // commit the drag state before advancing the fake clock so the listener is registered.
  await page.waitForTimeout(50)
  await page.clock.runFor(100)
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(50)
  await page.clock.runFor(100)
  await page.keyboard.press('Space')
  await expect
    .poll(() => page.locator('.composed-panel').first().getAttribute('data-panel-id'))
    .not.toBe(firstId)
  await expect(page.locator('.task-row[draggable],.task-row [draggable]')).toHaveCount(0)
  await page.goto('/')
  await page.locator('.nav-row', { hasText: '我的工作台' }).click()
  await expect(page.locator('.composed-panel')).toHaveCount(4)
  await expect(page.locator('.composed-panel', { hasText: '紧急待办' })).toHaveCSS(
    '--panel-span',
    '2',
  )
})

test('focus automatically fills the right pane after three seconds and supports timer controls', async ({
  page,
}) => {
  await page.locator('.nav-row', { hasText: '全部任务' }).click()
  await page.locator('.task-start').first().click()
  await page.clock.runFor(3000)
  const focus = page.locator('.focus-screen')
  await expect(focus).toBeVisible()
  await expect(page.locator('.sidebar')).toBeVisible()
  const focusBox = await focus.boundingBox(),
    mainBox = await page.locator('.main').boundingBox()
  expect(focusBox!.x).toBe(mainBox!.x)
  expect(focusBox!.width).toBe(mainBox!.width)
  expect(await page.evaluate(() => document.fullscreenElement)).toBeNull()
  await expect(focus.locator('h1')).not.toBeEmpty()
  await page.clock.runFor(6000)
  await focus.getByRole('button', { name: '暂停', exact: true }).click()
  const paused = await focus.locator('.focus-clock').textContent()
  await page.clock.runFor(10_000)
  await expect(focus.locator('.focus-clock')).toHaveText(paused!)
  await focus.getByRole('button', { name: '继续', exact: true }).click()
  await page.clock.runFor(3000)
  await focus.getByRole('button', { name: '停止并保存', exact: true }).click()
  await expect(focus).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false)
  await expect(page.locator('.work-timer')).toHaveCount(0)
  const entries = (await read(page)).timeEntries.filter((item) => !item.deletedAt)
  expect(entries).toHaveLength(2)
})

test('leaving pane focus keeps the same work session running', async ({ page }) => {
  await page.locator('.nav-row', { hasText: '全部任务' }).click()
  await page.locator('.task-start').first().click()
  await page.clock.runFor(3000)
  await expect(page.locator('.focus-screen')).toBeVisible()
  await page.locator('.focus-exit').click()
  await expect(page.locator('.focus-screen')).toHaveCount(0)
  expect((await read(page)).timer?.startedAt).not.toBeNull()
  await page.locator('.work-timer').getByRole('button', { name: '专注', exact: true }).click()
  await expect(page.locator('.focus-screen')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.focus-screen')).toHaveCount(0)
  expect((await read(page)).timer?.startedAt).not.toBeNull()
})
