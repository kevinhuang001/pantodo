import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { choose } from './helpers'
import { setCaptureSchedule } from '../scripts/capture-fixture.mjs'
import type { Workspace } from '../src/domain/types'
const read = async (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('pantodo.workspace.v2')!) as Workspace)
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-19T09:00:00+08:00') })
  await page.goto('/?reset=1')
  await expect(page.locator('.capture-desk')).toBeVisible()
})
test('stores one custom repeating task and computes calendar cycles, single deletion and completion live', async ({
  page,
}) => {
  const initial = (await read(page)).tasks.length
  await page.locator('#pantodo-inbox-input').fill('每周实验记录')
  await setCaptureSchedule(page, {
    start: '2026-10-19T10:00',
    end: '2026-10-19T11:00',
    due: '2026-10-19T18:00',
    estimate: '60',
  })
  await page.locator('.capture-options').getByRole('button', { name: '重复', exact: true }).click()
  await choose(page, page.getByRole('combobox', { name: '重复频率', exact: true }), 'weekly')
  const repeat = page.locator('.repeat-popover')
  await repeat.getByRole('button', { name: '周三', exact: true }).click()
  await repeat.getByRole('button', { name: '完成', exact: true }).click()
  await page.getByRole('button', { name: '记下来', exact: true }).click()
  let w = await read(page)
  expect(w.tasks).toHaveLength(initial + 1)
  const source = w.tasks.find((t) => t.title === '每周实验记录')!
  expect(source.recurrence!.weekdays.sort()).toEqual([1, 3])
  expect(source.occurrenceKey).toBeUndefined()
  await page.locator('.nav-row', { hasText: '时间表' }).click()
  const blocks = page.locator(`[data-todo-id="${source.id}"]`)
  await expect(blocks).toHaveCount(2)
  await blocks.first().click()
  await page.locator('.task-editor .danger-button').click()
  await page.getByRole('button', { name: '仅删除本次', exact: true }).click()
  await expect(blocks).toHaveCount(1)
  w = await read(page)
  expect(w.tasks).toHaveLength(initial + 1)
  expect(
    w.tasks.find((t) => t.id === source.id)!.occurrences!['2026-10-19']!.deletedAt,
  ).toBeTruthy()
  await page.clock.setSystemTime(new Date('2026-10-21T09:00:00+08:00'))
  await page.goto('/')
  await page.locator('.nav-row', { hasText: '全部任务' }).click()
  const row = page.locator(`[data-series-id="${source.id}"][data-occurrence="2026-10-21"]`)
  await row.getByRole('checkbox').click()
  await page.getByRole('button', { name: '完成', exact: true }).click()
  w = await read(page)
  expect(w.tasks.find((t) => t.id === source.id)!.status).toBe('todo')
  expect(w.tasks.find((t) => t.id === source.id)!.occurrences!['2026-10-21']!.status).toBe('done')
  await row.locator('.task-body').click()
  const editor = page.locator('.task-editor')
  await expect(editor.locator('#task-status')).toHaveAttribute('data-status', 'done')
  await expect(editor.locator('button#task-status, select#task-status')).toHaveCount(0)
  await editor.getByRole('button', { name: '重复', exact: true }).click()
  await expect(page.locator('.repeat-heading')).toBeFocused()
  await expect(page.getByRole('combobox', { name: '重复频率', exact: true })).not.toBeFocused()
  const records = page.locator('.repeat-records')
  await expect(
    records.locator('[data-occurrence="2026-10-19"] .occurrence-status'),
  ).toHaveAttribute('data-status', 'skipped')
  await expect(
    records.locator('[data-occurrence="2026-10-21"] .occurrence-status'),
  ).toHaveAttribute('data-status', 'done')
  await expect(
    records.locator('[data-occurrence="2026-10-26"] .occurrence-status'),
  ).toHaveAttribute('data-status', 'todo')
  await page.keyboard.press('Escape')
  await editor.locator('#task-title').fill('每周实验记录更新')
  await page.locator('button[form="pantodo-task-form"]').click()
  expect(
    (await read(page)).tasks.find((t) => t.id === source.id)!.occurrences!['2026-10-21']!.status,
  ).toBe('done')
  await row.getByRole('button', { name: '删除', exact: true }).click()
  await page.getByRole('button', { name: '删除整个系列', exact: true }).click()
  await expect(row).toHaveCount(0)
  expect((await read(page)).tasks.find((t) => t.id === source.id)!.deletedAt).not.toBeNull()
})
test('an untimed repeating task appears in the all-day area without making persisted task copies', async ({
  page,
}) => {
  await page.locator('#pantodo-inbox-input').fill('每日阅读')
  await page.locator('.capture-options').getByRole('button', { name: '重复', exact: true }).click()
  await choose(page, page.getByRole('combobox', { name: '重复频率', exact: true }), 'daily')
  await page.locator('.repeat-popover').getByRole('button', { name: '完成', exact: true }).click()
  await page.getByRole('button', { name: '记下来', exact: true }).click()
  await page.locator('.nav-row', { hasText: '时间表' }).click()
  await expect(page.locator('.tt-allday-days button', { hasText: '每日阅读' })).toHaveCount(7)
  expect((await read(page)).tasks.filter((t) => t.title === '每日阅读')).toHaveLength(1)
})

test('Repeat opens without selecting a field while keyboard navigation remains available', async ({
  page,
}) => {
  await page.locator('.capture-options').getByRole('button', { name: '重复', exact: true }).click()
  await expect(page.locator('.repeat-heading')).toBeFocused()
  await expect(page.getByRole('combobox', { name: '重复频率', exact: true })).not.toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('combobox', { name: '重复频率', exact: true })).toBeFocused()
})

test('an unconfigured Repeat uses the same borderless appearance as other capture properties', async ({
  page,
}) => {
  const repeat = page.locator('.capture-options .repeat-trigger')
  await expect(repeat).toHaveAttribute('data-filled', 'false')
  await expect(repeat).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)')
  await expect(repeat).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await repeat.click()
  await choose(page, page.getByRole('combobox', { name: '重复频率', exact: true }), 'weekly')
  await page.locator('.repeat-popover').getByRole('button', { name: '完成', exact: true }).click()
  await expect(repeat).toHaveAttribute('data-filled', 'true')
})

test('shows all saved cycles, catches up after restart and midnight, and isolates work and completion', async ({
  page,
}) => {
  await page.locator('#pantodo-inbox-input').fill('每日复盘')
  await page.locator('.capture-options').getByRole('button', { name: '重复', exact: true }).click()
  await choose(page, page.getByRole('combobox', { name: '重复频率', exact: true }), 'daily')
  await page.locator('.repeat-popover').getByRole('button', { name: '完成', exact: true }).click()
  await page.getByRole('button', { name: '记下来', exact: true }).click()
  const source = (await read(page)).tasks.find((t) => t.title === '每日复盘')!
  await page.clock.setSystemTime(new Date('2026-10-22T09:00:00+08:00'))
  await page.goto('/')
  await page.locator('.nav-row', { hasText: '全部任务' }).click()
  const rows = page.locator(`[data-series-id="${source.id}"]`)
  await expect(rows).toHaveCount(4)
  const w = await read(page)
  expect(Object.keys(w.tasks.find((t) => t.id === source.id)!.occurrences!)).toHaveLength(4)
  expect(w.tasks.filter((t) => t.id === source.id)).toHaveLength(1)
  const old = rows.filter({ has: page.locator('[datetime="2026-10-21"]') })
  await old.getByRole('button', { name: '开始工作', exact: true }).click()
  await page.locator('.focus-countdown button').click()
  await page.clock.runFor(1000)
  const previous = page.locator(`[data-series-id="${source.id}"][data-occurrence="2026-10-20"]`)
  await previous.getByRole('checkbox').click()
  await page.getByRole('button', { name: '完成', exact: true }).click()
  expect((await read(page)).timer?.occurrenceKey).toBe('2026-10-21')
  await page.getByRole('button', { name: '停止并保存', exact: true }).click()
  const after = await read(page)
  const records = after.tasks.find((t) => t.id === source.id)!.occurrences!
  expect(records['2026-10-20']!.status).toBe('done')
  expect(records['2026-10-21']!.status).toBe('doing')
  expect(records['2026-10-22']!.status).toBe('todo')
  expect(
    after.timeEntries.some((e) => e.taskId === source.id && e.occurrenceKey === '2026-10-21'),
  ).toBe(true)
  await page.clock.setSystemTime(new Date('2026-10-23T00:00:10+08:00'))
  await page.clock.runFor(60000)
  await expect(rows).toHaveCount(5)
  await page.goto('/')
  await page.locator('.nav-row', { hasText: '全部任务' }).click()
  await expect(rows).toHaveCount(5)
  expect((await read(page)).tasks.filter((t) => t.id === source.id)).toHaveLength(1)
  await page.locator('.nav-row', { hasText: '今天' }).first().click()
  await expect(rows).toHaveCount(1)
  await expect(rows).toHaveAttribute('data-occurrence', '2026-10-23')
})

test('completion immediately saves and displays the next future cycle, with catch-up after reopen', async ({
  page,
}) => {
  await page.locator('#pantodo-inbox-input').fill('完成后接着生成')
  await page.locator('.capture-options').getByRole('button', { name: '重复', exact: true }).click()
  await choose(page, page.getByRole('combobox', { name: '重复频率', exact: true }), 'daily')
  await page.locator('.repeat-popover').getByRole('button', { name: '完成', exact: true }).click()
  await page.getByRole('button', { name: '记下来', exact: true }).click()
  const source = (await read(page)).tasks.find((t) => t.title === '完成后接着生成')!
  await page.locator('.nav-row', { hasText: '全部任务' }).click()
  const rows = page.locator(`[data-series-id="${source.id}"]`)
  const complete = async (key: string) => {
    await page
      .locator(`[data-series-id="${source.id}"][data-occurrence="${key}"]`)
      .getByRole('checkbox')
      .click()
    await page.getByRole('button', { name: '完成', exact: true }).click()
  }
  await complete('2026-10-19')
  await expect(rows).toHaveCount(2)
  await expect(
    page.locator(`[data-series-id="${source.id}"][data-occurrence="2026-10-20"]`),
  ).toBeVisible()
  await complete('2026-10-20')
  await expect(rows).toHaveCount(3)
  await page.goto('/')
  await page.locator('.nav-row', { hasText: '全部任务' }).click()
  await expect(rows).toHaveCount(3)
  await page.clock.setSystemTime(new Date('2026-10-25T09:00:00+08:00'))
  await page.goto('/')
  await page.locator('.nav-row', { hasText: '全部任务' }).click()
  await expect(rows).toHaveCount(7)
  const saved = (await read(page)).tasks.filter((t) => t.id === source.id)
  expect(saved).toHaveLength(1)
  expect(Object.keys(saved[0].occurrences!)).toHaveLength(7)
  expect(saved[0].occurrences!['2026-10-20'].status).toBe('done')
  expect(saved[0].occurrences!['2026-10-21'].status).toBe('todo')
})
