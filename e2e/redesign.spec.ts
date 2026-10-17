import { test, expect, type Page } from '@playwright/test'
const modes = (page: Page) => page.getByRole('group', { name: '展示方式', exact: true })
test.beforeEach(async ({ page }) => {
  await page.goto('/?reset=1')
  await expect(page.locator('.capture-desk')).toBeVisible()
})

test('create is one borderless writing surface with a stable, nonrepeating quote', async ({
  page,
}) => {
  const quote = await page.locator('.capture-greeting h2').innerText()
  await expect(
    page.locator(
      '.capture-subtitle,.capture-hint,.desk-footer,.desk-notes,.capture-center > .little-label',
    ),
  ).toHaveCount(0)
  const border = await page
    .locator('#pantodo-inbox-input')
    .evaluate((el) => getComputedStyle(el).borderTopWidth)
  expect(border).toBe('0px')
  await page.locator('#pantodo-inbox-input').fill('记录一个想法')
  await expect(page.locator('.capture-greeting h2')).toHaveText(quote)
  await page.locator('.nav-row', { hasText: '全部任务' }).click()
  await page.locator('.nav-row', { hasText: '创建' }).click()
  await expect(page.locator('.capture-greeting h2')).not.toHaveText(quote)
  expect((await page.locator('.toolbar').boundingBox())!.height).toBeLessThanOrEqual(44)
})

test('list, gallery, board and panels use the same tasks and remember the chosen presentation', async ({
  page,
}) => {
  await page.locator('.nav-row', { hasText: '我的工作台' }).click()
  await expect(page.locator('.composed-panel')).toHaveCount(3)
  await modes(page).getByRole('button', { name: '画廊', exact: true }).click()
  await expect(page.locator('.task-gallery')).toHaveCount(1)
  const ids = await page
    .locator('.task-gallery .task-row')
    .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-task-id')))
  expect(new Set(ids).size).toBe(ids.length)
  expect(ids.length).toBeGreaterThan(0)
  await page.locator('.task-gallery .task-body').first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click()
  await modes(page).getByRole('button', { name: '看板', exact: true }).click()
  await expect(page.locator('.status-column')).toHaveCount(4)
  await expect(page.locator('.task-status-board .task-row')).toHaveCount(ids.length)
  await modes(page).getByRole('button', { name: '列表', exact: true }).click()
  await expect(page.locator('.task-list > .task-row')).toHaveCount(ids.length)
  await page.goto('/')
  await page.locator('.nav-row', { hasText: '我的工作台' }).click()
  await expect(modes(page).getByRole('button', { name: '列表', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.locator('.composed-panel')).toHaveCount(0)
})

test('panel handles actually drag with pointer input and persist their new positions', async ({
  page,
}) => {
  await page.locator('.nav-row', { hasText: '我的工作台' }).click()
  const first = page.locator('.composed-panel').first(),
    second = page.locator('.composed-panel').nth(1)
  const firstId = await first.getAttribute('data-panel-id'),
    secondId = await second.getAttribute('data-panel-id')
  const start = await first.locator('.panel-move').boundingBox(),
    end = await second.locator('.panel-move').boundingBox()
  await page.mouse.move(start!.x + start!.width / 2, start!.y + start!.height / 2)
  await page.mouse.down()
  await page.mouse.move(start!.x + start!.width / 2 + 10, start!.y + start!.height / 2, {
    steps: 4,
  })
  await expect(page.locator(`[data-panel-id="${firstId}"]`)).toHaveAttribute(
    'data-dragging',
    'true',
  )
  await page.mouse.move(end!.x + end!.width / 2, end!.y + end!.height / 2, { steps: 15 })
  await page.mouse.up()
  await expect(page.locator('.composed-panel').first()).toHaveAttribute('data-panel-id', secondId!)
  await page.goto('/')
  await page.locator('.nav-row', { hasText: '我的工作台' }).click()
  await expect(page.locator('.composed-panel').first()).toHaveAttribute('data-panel-id', secondId!)
  await expect(page.locator('.task-row[draggable],.task-row [draggable]')).toHaveCount(0)
})

test('projects have identity only, while tags retain their color picker', async ({ page }) => {
  await page.getByRole('button', { name: '新建项目', exact: true }).click()
  await expect(page.getByRole('dialog').locator('.swatches')).toHaveCount(0)
  await page.locator('#entity-name').fill('实验')
  await page.locator('button[form="pantodo-entity-form"]').click()
  const project = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('pantodo.workspace.v2')!).projects.find(
      (project: { name: string }) => project.name === '实验',
    ),
  )
  expect(project).not.toHaveProperty('color')
  await page.getByRole('button', { name: '新建标签', exact: true }).click()
  await expect(page.getByRole('dialog').locator('.swatches')).toBeVisible()
})

test('view settings stay basic and the calendar zoom is dragged directly', async ({ page }) => {
  await page.locator('.nav-row', { hasText: '我的工作台' }).click()
  await page.getByRole('button', { name: '视图设置', exact: true }).click()
  await expect(page.locator('#view-name')).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('combobox')).toHaveCount(0)
  await expect(
    page.locator('#view-template,#view-presentation,#view-columns,#view-arrangement'),
  ).toHaveCount(0)
  await page.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click()
  await page.locator('.nav-row', { hasText: '时间表' }).click()
  const thumb = page.getByRole('slider', { name: '时间表缩放' })
  const before = await thumb.getAttribute('aria-valuenow'),
    box = await thumb.boundingBox()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width / 2 + 20, box!.y + box!.height / 2, { steps: 8 })
  await page.mouse.up()
  await expect(thumb).not.toHaveAttribute('aria-valuenow', before!)
  const height = await thumb.getAttribute('aria-valuenow')
  await page.goto('/')
  await page.locator('.nav-row', { hasText: '时间表' }).click()
  await expect(page.getByRole('slider', { name: '时间表缩放' })).toHaveAttribute(
    'aria-valuenow',
    height!,
  )
})
