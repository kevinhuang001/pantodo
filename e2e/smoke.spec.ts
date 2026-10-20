import { selectDuration } from '../scripts/date-fixture.mjs'
import { choose } from './helpers'
import { expect, test } from '@playwright/test'

/**
 * The app seeds Chinese labels because the config pins `locale: 'zh-CN'`; structural selectors
 * (classes, ids) are used wherever possible so the suite stays honest about what it checks.
 */
test.beforeEach(async ({ page }) => {
  await page.goto('/?reset=1')
  await expect(page.locator('.capture-desk')).toBeVisible()
  await page.locator('.nav-row', { hasText: '全部任务' }).click()
})

test('renders the flush glass frame with the seeded views', async ({ page }) => {
  await expect(page.locator('.sidebar')).toBeVisible()
  await expect(page.locator('.sidebar .identity-text strong')).toHaveText('Pantodo')

  // The sidebar and the content are flush: no gap, no inset, and no radius on the seam.
  const frame = await page.locator('#app').evaluate((element) => {
    const style = getComputedStyle(element)
    return { gap: style.gap, padding: style.paddingLeft }
  })
  expect(frame.gap).toBe('0px')
  expect(frame.padding).toBe('0px')

  const sidebarCorners = await page.locator('.sidebar').evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      left: style.borderTopLeftRadius,
      right: style.borderTopRightRadius,
      bottomRight: style.borderBottomRightRadius,
    }
  })
  expect(sidebarCorners.left).toBe('0px')
  expect(sidebarCorners.right).toBe('0px')
  expect(sidebarCorners.bottomRight).toBe('0px')

  // No view/timetable switch, no Upcoming, no "new task" button anywhere.
  await expect(page.locator('.tabs')).toHaveCount(0)
  await expect(page.locator('.nav-row', { hasText: '时间表' })).toHaveCount(1)
  for (const name of ['创建', '今天', '全部任务', '我的工作台', '回收站']) {
    await expect(page.locator('.nav-row', { hasText: name })).toHaveCount(1)
  }
  await expect(page.locator('.nav-row', { hasText: '即将到来' })).toHaveCount(0)
  await expect(page.locator('.toolbar .primary')).toHaveCount(0)
  await expect(page.locator('.nav-row.active')).toContainText('全部任务')
})

test('captures a task from the inbox composer', async ({ page }) => {
  await page.locator('.nav-row', { hasText: '创建' }).click()
  await expect(page.locator('.capture-card')).toBeVisible()

  await page.locator('#pantodo-inbox-input').fill('e2e 收件箱捕获')
  await page.locator('#pantodo-inbox-input').press('Enter')

  await expect(page.locator('#pantodo-inbox-input')).toHaveValue('')
  await page.locator('.nav-row', { hasText: '全部任务' }).click()
  await expect(page.locator('.task-row', { hasText: 'e2e 收件箱捕获' })).toBeVisible()
  await page.locator('.nav-row', { hasText: '创建' }).click()
  await expect(page.locator('#pantodo-inbox-input')).toHaveValue('')
})

test('confirms completion and reopens directly', async ({ page }) => {
  const taskId = await page.locator('.task-row').first().getAttribute('data-task-id')
  expect(taskId).not.toBeNull()
  const row = page.locator(`[data-task-id="${taskId}"]`)

  await row.locator('.task-check').click()
  await expect(page.getByRole('dialog')).toContainText('确认完成？')
  await page.getByRole('dialog').getByRole('button', { name: '完成', exact: true }).click()
  await expect(row.locator('.task-check')).toHaveClass(/done/)
  await expect(row).toHaveClass(/done/)
})

test('edits a task through the dialog', async ({ page }) => {
  await page.locator('.nav-row', { hasText: '全部任务' }).click()
  const row = page.locator('.task-row').first()
  const title = await row.locator('.task-title').innerText()

  await row.hover()
  await row.locator('button[aria-label="编辑"]').click()
  await expect(page.locator('[role="dialog"].dialog')).toBeVisible()
  await page.locator('#task-title').fill(`${title}：改过了`)
  await page.getByRole('button', { name: '计划时长', exact: true }).click()
  await selectDuration(page, '90')
  await page.locator('button[form="pantodo-task-form"]').click()

  await expect(page.locator('.task-row', { hasText: '改过了' })).toBeVisible()
})

test('keeps creation focused and opens saved composed views', async ({ page }) => {
  await page.locator('.nav-row', { hasText: '创建' }).click()
  await expect(
    page.locator(
      '.capture-subtitle,.capture-hint,.desk-footer,.desk-notes,.capture-center > .little-label',
    ),
  ).toHaveCount(0)
  await page.locator('.nav-row', { hasText: '我的工作台' }).click()
  await expect(page.locator('.composed-panel')).toHaveCount(3)
  await expect(page.locator('.preview-badge')).toHaveCount(0)
  await expect(page.locator('.nav-row.active')).toContainText('我的工作台')
})

test('changes saved panel layouts', async ({ page }) => {
  await page.locator('.nav-row', { hasText: '我的工作台' }).click()
  const layout = page.getByRole('group', { name: '排列方式' })
  await layout.getByRole('button', { name: '纵向' }).click()
  await expect
    .poll(async () =>
      page
        .locator('.composed-panels')
        .evaluate((el) => el.style.getPropertyValue('--panel-columns')),
    )
    .toBe('1')
  await layout.getByRole('button', { name: '分栏' }).click()
  await expect
    .poll(async () =>
      page
        .locator('.composed-panels')
        .evaluate((el) => el.style.getPropertyValue('--panel-columns')),
    )
    .toBe('2')
})

test('switches to the dark theme', async ({ page }) => {
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await page.getByRole('button', { name: '设置', exact: true }).click()
  await choose(page, page.getByRole('combobox', { name: '主题', exact: true }), 'dark')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('switches language and re-localises built-in views', async ({ page }) => {
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await choose(page, page.getByRole('combobox', { name: '语言', exact: true }), 'en')

  await expect(page.locator('.nav-row.active')).toContainText('All tasks')
  await expect(page.locator('.nav-row', { hasText: 'Create' })).toHaveCount(1)
})

test('searches, then shows an empty state for no matches', async ({ page }) => {
  await page.locator('#pantodo-search').fill('设计评审')
  await expect(page.locator('.task-row')).toHaveCount(1)

  await page.locator('#pantodo-search').fill('zzz-not-found')
  await expect(page.locator('.empty-state')).toBeVisible()
  await expect(page.locator('.task-row')).toHaveCount(0)
})

test('deletes to the trash and restores from it', async ({ page }) => {
  const title = await page.locator('.task-row .task-title').first().innerText()
  await page.locator('.task-row').first().hover()
  await page.locator('.task-row').first().locator('button[aria-label="删除"]').click()
  await page.locator('.dialog .danger-button').click()

  await expect(page.locator('.task-row', { hasText: title })).toHaveCount(0)

  await page.locator('.nav-row', { hasText: '回收站' }).click()
  const trashed = page.locator('.task-row', { hasText: title })
  await expect(trashed).toBeVisible()
  await trashed.hover()
  await trashed.locator('button[aria-label="恢复"]').click()
  await expect(page.locator('.task-row', { hasText: title })).toHaveCount(0)
})

test('opens the settings window and moves between panes', async ({ page }) => {
  await page.locator('.sidebar').getByRole('button', { name: '设置' }).click()
  const settings = page.locator('[role="dialog"].settings-window')
  await expect(settings).toBeVisible()

  await settings.locator('.settings-nav button', { hasText: '计时' }).click()
  await expect(settings.locator('.settings-timer-note')).toContainText('退出时停止')

  await settings.locator('.settings-nav button', { hasText: '关于' }).click()
  await expect(settings.getByRole('button', { name: '检查更新', exact: true })).toBeVisible()

  await settings.locator('.settings-footer .primary').click()
  await expect(settings).toHaveCount(0)
})

test('the timetable is a left-hand row with a zoomable week grid', async ({ page }) => {
  await page.locator('.nav-row', { hasText: '时间表' }).click()

  await expect(page.locator('.nav-row.active')).toContainText('时间表')
  await expect(page.locator('.timetable .tt-column')).toHaveCount(7)
  await expect(page.locator('.timetable .tt-hour')).toHaveCount(24)
  await expect(page.locator('.timetable .tt-block').first()).toBeVisible()
  await expect(page.locator('.tt-deadline').first()).toBeVisible()
  await expect(page.locator('.timetable .tt-now')).toHaveCount(1)
  await expect(page.locator('.toolbar .primary')).toHaveCount(0)

  const body = page.locator('.timetable .tt-body')
  const large = await body.evaluate((element) => element.style.height)

  const zoom = page.getByRole('slider', { name: '时间表缩放' })
  await zoom.focus()
  await zoom.press('Home')
  await expect.poll(async () => body.evaluate((element) => element.style.height)).toBe('864px')
  await zoom.press('End')
  await expect.poll(async () => body.evaluate((element) => element.style.height)).toBe('3456px')
  expect(large).not.toBe('864px')
})

test('creates a custom view that joins the views list', async ({ page }) => {
  const viewsSection = page.locator('.sidebar-section', { hasText: '视图' })
  await viewsSection.getByRole('button', { name: '新建视图' }).click()

  await page.locator('#view-name').fill('e2e 自定义视图')
  await page.locator('button[form="pantodo-view-form"]').click()
  await expect(page.locator('.nav-row.active')).toContainText('e2e 自定义视图')
  await expect(page.locator('.nav-row', { hasText: 'e2e 自定义视图' })).toHaveCount(1)
  await expect(page.getByRole('button', { name: '添加面板', exact: true })).toBeVisible()
  await expect(page.locator('.composed-panel')).toHaveCount(0)
})

test('persists captured tasks across a reload', async ({ page }) => {
  await page.locator('.nav-row', { hasText: '创建' }).click()
  await page.locator('#pantodo-inbox-input').fill('刷新后仍在的任务')
  await page.locator('#pantodo-inbox-input').press('Enter')
  await page.locator('.nav-row', { hasText: '全部任务' }).click()
  await expect(page.locator('.task-row', { hasText: '刷新后仍在的任务' })).toBeVisible()

  await page.goto('/')
  await page.locator('.nav-row', { hasText: '创建' }).click()
  await page.locator('.nav-row', { hasText: '全部任务' }).click()
  await expect(page.locator('.task-row', { hasText: '刷新后仍在的任务' })).toBeVisible()
})
