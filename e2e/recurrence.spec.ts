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
  expect(w.tasks.find((t) => t.id === source.id)!.skippedOccurrences).toEqual(['2026-10-19'])
  await page.goto('/')
  await page.locator('.nav-row', { hasText: '全部任务' }).click()
  const row = page.locator(`[data-task-id="${source.id}"]`)
  await row.getByRole('checkbox').click()
  await page.getByRole('button', { name: '完成', exact: true }).click()
  w = await read(page)
  expect(w.tasks.find((t) => t.id === source.id)!.status).toBe('todo')
  expect(w.tasks.find((t) => t.id === source.id)!.occurrenceStates!['2026-10-21']!.status).toBe(
    'done',
  )
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
