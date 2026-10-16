import { expect, test } from '@playwright/test'

/**
 * The app seeds Chinese labels because the config pins `locale: 'zh-CN'`; structural selectors
 * (classes, ids) are used wherever possible so the suite stays honest about what it checks.
 */
test.beforeEach(async ({ page }) => {
  await page.goto('/?reset=1')
  await expect(page.locator('.task-row').first()).toBeVisible()
})

test('renders the glass shell with seeded views', async ({ page }) => {
  await expect(page.locator('.sidebar')).toBeVisible()
  await expect(page.locator('.sidebar .identity-text strong')).toHaveText('Pantodo')
  await expect(page.locator('.toolbar h1')).toHaveText('今天')

  const rows = page.locator('nav .nav-row')
  await expect(rows).toHaveCount(6)
  await expect(rows.filter({ hasText: '四象限' })).toHaveCount(1)
  await expect(rows.filter({ hasText: '回收站' })).toHaveCount(1)

  await expect(page.locator('.group-board, .task-list').first()).toBeVisible()
  await expect(page.locator('.toolbar .count')).toContainText('3 个任务')
  expect(await page.locator('.task-row').count()).toBeGreaterThanOrEqual(3)
})

test('creates a task through the dialog', async ({ page }) => {
  await page.locator('.toolbar .primary').click()
  await expect(page.locator('dialog.dialog')).toBeVisible()
  await page.locator('#task-title').fill('e2e 新建的任务')
  await page.locator('#task-estimate').fill('25')
  await page.locator('button[form="pantodo-task-form"]').click()

  await expect(page.locator('dialog.dialog')).toHaveCount(0)
  await page.locator('.nav-row', { hasText: '全部任务' }).click()
  await expect(page.locator('.task-row', { hasText: 'e2e 新建的任务' })).toBeVisible()
})

test('cycles a task through todo, doing and done', async ({ page }) => {
  const taskId = await page.locator('.task-row').first().getAttribute('data-task-id')
  expect(taskId).not.toBeNull()
  const row = page.locator(`[data-task-id="${taskId}"]`)

  await row.locator('.task-check').click()
  await expect(row.locator('.task-check')).toHaveClass(/doing/)
  await row.locator('.task-check').click()
  await expect(row.locator('.task-check')).toHaveClass(/done/)
  await expect(row).toHaveClass(/done/)
})

test('the quadrant view renders four pinned cells in a 2x2 grid', async ({ page }) => {
  await page.locator('.nav-row', { hasText: '四象限' }).click()

  const board = page.locator('.group-board[data-arrangement="grid"]')
  await expect(board).toBeVisible()
  const groups = board.locator('.group')
  await expect(groups).toHaveCount(4)
  await expect(groups.nth(0).locator('.group-head h2')).toHaveText('重要且紧急')
  await expect(groups.nth(3).locator('.group-head h2')).toHaveText('都不紧急也不重要')

  // 2×2: the first two cells share a row.
  const first = await groups.nth(0).boundingBox()
  const second = await groups.nth(1).boundingBox()
  const third = await groups.nth(2).boundingBox()
  expect(first).not.toBeNull()
  expect(second).not.toBeNull()
  expect(third).not.toBeNull()
  expect(Math.abs((first?.y ?? 0) - (second?.y ?? 0))).toBeLessThan(4)
  expect(third?.y ?? 0).toBeGreaterThan((first?.y ?? 0) + 10)
})

test('switches arrangement to vertical and back to columns', async ({ page }) => {
  await page.locator('.nav-row', { hasText: '四象限' }).click()
  const board = page.locator('.group-board')

  const arrangement = page.getByRole('group', { name: '排列方式' })
  await arrangement.getByRole('button', { name: '纵向' }).click()
  await expect(board).toHaveAttribute('data-arrangement', 'vertical')

  await arrangement.getByRole('button', { name: '横向' }).click()
  await expect(board).toHaveAttribute('data-arrangement', 'columns')
})

test('switches to the dark theme', async ({ page }) => {
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await page.locator('.toolbar .menu').first().locator('summary').click()
  await page.locator('.menu-panel .menu-item', { hasText: '深色' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('switches language and re-localises built-in views', async ({ page }) => {
  await page.locator('.toolbar .menu').nth(1).locator('summary').click()
  await page.locator('.menu-panel .menu-item', { hasText: 'English' }).click()

  await expect(page.locator('.toolbar h1')).toHaveText('Today')
  await expect(page.locator('.nav-row', { hasText: 'Inbox' })).toHaveCount(1)
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
  const settings = page.locator('dialog.settings-window')
  await expect(settings).toBeVisible()

  await settings.locator('.settings-nav button', { hasText: '提醒' }).click()
  await expect(settings.locator('input[type="number"]')).toBeVisible()

  await settings.locator('.settings-nav button', { hasText: '关于' }).click()
  await expect(settings.locator('.settings-card')).toContainText('Tauri 2')

  await settings.locator('.settings-footer .primary').click()
  await expect(settings).toHaveCount(0)
})

test('persists changes across a reload', async ({ page }) => {
  await page.locator('.toolbar .primary').click()
  await page.locator('#task-title').fill('刷新后仍在的任务')
  await page.locator('button[form="pantodo-task-form"]').click()

  await page.goto('/')
  await page.locator('.nav-row', { hasText: '全部任务' }).click()
  await expect(page.locator('.task-row', { hasText: '刷新后仍在的任务' })).toBeVisible()
})

test('the timetable is its own tab, not a per-view layout', async ({ page }) => {
  const tabs = page.locator('.tabs .tab')
  await expect(tabs).toHaveCount(2)
  await expect(tabs.nth(0)).toHaveText(/视图/)

  await tabs.nth(1).click()
  await expect(page.locator('.toolbar h1')).toHaveText('时间表')
  await expect(page.getByRole('group', { name: '布局' })).toHaveCount(0)
  await expect(page.locator('.empty-state')).toContainText('M2')

  await tabs.nth(0).click()
  await expect(page.getByRole('group', { name: '布局' })).toHaveCount(1)
})

test('creates a custom view that is listed under My views', async ({ page }) => {
  const myViews = page.locator('.sidebar-section', { hasText: '我的视图' })
  await expect(myViews).toContainText('还没有自定义视图')

  await myViews.getByRole('button', { name: '新建视图' }).click()
  await page.locator('#view-name').fill('e2e 自定义视图')
  await page.locator('#view-group').selectOption('tag')
  await page.locator('#view-arrangement').selectOption('columns')
  await page.locator('button[form="pantodo-view-form"]').click()

  await expect(page.locator('.toolbar h1')).toHaveText('e2e 自定义视图')
  await expect(myViews.locator('.nav-row', { hasText: 'e2e 自定义视图' })).toHaveCount(1)
  await expect(page.locator('.group-board[data-arrangement="columns"]')).toBeVisible()
})
