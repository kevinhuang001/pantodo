import { test, expect } from '@playwright/test'
import { setCaptureSchedule } from '../scripts/capture-fixture.mjs'
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-19T09:00:00+08:00') })
  await page.goto('/?reset=1')
  await expect(page.locator('.capture-desk')).toBeVisible()
})
test('searchable project and tag pickers capture selected metadata and keep the writing surface quiet', async ({
  page,
}) => {
  await page.locator('#pantodo-inbox-input').fill('整理新实验')
  await page.getByRole('button', { name: '项目', exact: true }).click()
  await page.getByRole('textbox', { name: '搜索项目…', exact: true }).fill('产品')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: '项目', exact: true })).toContainText('产品')
  await page.getByRole('button', { name: '标签', exact: true }).click()
  await page.getByRole('textbox', { name: '搜索标签…', exact: true }).fill('重要')
  await page.getByRole('checkbox', { name: '重要', exact: true }).check()
  await page.getByRole('textbox', { name: '搜索标签…', exact: true }).fill('深度')
  await page.getByRole('checkbox', { name: '深度工作', exact: true }).check()
  await page
    .locator('.capture-entity-picker')
    .getByRole('button', { name: '完成', exact: true })
    .click()
  await expect(page.getByRole('button', { name: '标签', exact: true })).toContainText(
    '重要、深度工作',
  )
  await setCaptureSchedule(page, {
    start: '2026-10-19T10:00',
    end: '2026-10-19T11:30',
    due: '2026-10-20T16:00',
    estimate: '90',
  })
  await page.getByRole('button', { name: '记下来', exact: true }).click()
  const workspace = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('pantodo.workspace.v2')!),
  )
  const todo = workspace.tasks.find((task: { title: string }) => task.title === '整理新实验')
  expect(todo.projectId).toBe(
    workspace.projects.find((project: { name: string }) => project.name === '产品').id,
  )
  expect(workspace.taskTags[todo.id]).toEqual(
    workspace.tags
      .filter((tag: { name: string }) => ['重要', '深度工作'].includes(tag.name))
      .map((tag: { id: string }) => tag.id),
  )
  expect(todo.startAt).toBe('2026-10-19T02:00:00.000Z')
  expect(todo.endAt).toBe('2026-10-19T03:30:00.000Z')
  expect(todo.dueAt).toBe('2026-10-20T08:00:00.000Z')
  expect(todo.estimateMinutes).toBe(90)
  await expect(page.locator('.capture-card .schedule-fields,.capture-card select')).toHaveCount(0)
})
test('view controls show localized tooltips on hover and keyboard focus', async ({ page }) => {
  await page.locator('.nav-row', { hasText: '全部任务' }).click()
  const modes = page.getByRole('group', { name: '展示方式', exact: true })
  for (const [name, tip] of [
    ['列表', '列表视图'],
    ['画廊', '画廊视图'],
  ]) {
    await modes.getByRole('button', { name, exact: true }).hover()
    await page.clock.runFor(300)
    await expect(page.locator('[data-slot="tooltip-content"]')).toContainText(tip)
    await page.mouse.move(100, 100)
    await page.clock.runFor(350)
  }
  await modes.getByRole('button', { name: '列表', exact: true }).focus()
  await expect(page.locator('[data-slot="tooltip-content"]')).toContainText('列表视图')
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-slot="tooltip-content"]')).toHaveCount(0)
})
test('pinch-style wheel zoom preserves the hour under the pointer and persists without zooming the app', async ({
  page,
}) => {
  await page.locator('.nav-row', { hasText: '时间表' }).click()
  await expect(
    page.locator('.calendar-controls').getByRole('button', { name: '今天', exact: true }),
  ).toHaveCount(0)
  const grid = page.locator('.tt-scroll'),
    box = (await grid.boundingBox())!,
    offset = 180
  const hour = await grid.evaluate(
    (node, offset) =>
      (node.scrollTop + offset) /
      Number(
        getComputedStyle(node.closest('.timetable')!)
          .getPropertyValue('--hour-height')
          .replace('px', ''),
      ),
    offset,
  )
  await page.mouse.move(box.x + 220, box.y + offset)
  await page.keyboard.down('Control')
  await page.mouse.wheel(0, -45)
  await page.keyboard.up('Control')
  await expect(page.getByRole('slider', { name: '时间表缩放' })).not.toHaveAttribute(
    'aria-valuenow',
    '76',
  )
  const after = await grid.evaluate(
    (node, offset) =>
      (node.scrollTop + offset) /
      Number(
        getComputedStyle(node.closest('.timetable')!)
          .getPropertyValue('--hour-height')
          .replace('px', ''),
      ),
    offset,
  )
  expect(Math.abs(after - hour)).toBeLessThan(0.05)
  const beforeBurst = await page
    .getByRole('slider', { name: '时间表缩放' })
    .getAttribute('aria-valuenow')
  // Multiple native events can arrive before React commits a frame.
  await grid.evaluate((node) => {
    const clientY = node.getBoundingClientRect().top + 180
    for (let i = 0; i < 3; i++)
      node.dispatchEvent(
        new WheelEvent('wheel', {
          ctrlKey: true,
          deltaY: -3,
          clientY,
          bubbles: true,
          cancelable: true,
        }),
      )
  })
  await expect(page.getByRole('slider', { name: '时间表缩放' })).not.toHaveAttribute(
    'aria-valuenow',
    beforeBurst!,
  )
  const burstHour = await grid.evaluate(
    (node) =>
      (node.scrollTop + 180) /
      Number(
        getComputedStyle(node.closest('.timetable')!)
          .getPropertyValue('--hour-height')
          .replace('px', ''),
      ),
  )
  expect(Math.abs(burstHour - hour)).toBeLessThan(0.05)
  await page.clock.runFor(250)
  const height = await page
    .getByRole('slider', { name: '时间表缩放' })
    .getAttribute('aria-valuenow')
  expect(await page.evaluate(() => window.visualViewport!.scale)).toBe(1)
  await page.goto('/')
  await page.locator('.nav-row', { hasText: '时间表' }).click()
  await expect(page.getByRole('slider', { name: '时间表缩放' })).toHaveAttribute(
    'aria-valuenow',
    height!,
  )
  const current = await page
    .getByRole('slider', { name: '时间表缩放' })
    .getAttribute('aria-valuenow')
  await page.mouse.wheel(0, 120)
  await expect(page.getByRole('slider', { name: '时间表缩放' })).toHaveAttribute(
    'aria-valuenow',
    current!,
  )
})
test('WebKit gestures and two-finger touch zoom work inside the calendar and save on leaving', async ({
  page,
}) => {
  await page.locator('.nav-row', { hasText: '时间表' }).click()
  await page.locator('.tt-scroll').evaluate((node) => {
    const y = node.getBoundingClientRect().top + 180
    for (const [type, scale] of [
      ['gesturestart', 1],
      ['gesturechange', 1.5],
      ['gestureend', 1.5],
    ] as const)
      node.dispatchEvent(
        Object.assign(new Event(type, { bubbles: true, cancelable: true }), { scale, clientY: y }),
      )
  })
  await expect(page.getByRole('slider', { name: '时间表缩放' })).toHaveAttribute(
    'aria-valuenow',
    '114',
  )
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 })
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: 600, y: 350, id: 0 },
      { x: 600, y: 550, id: 1 },
    ],
  })
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { x: 600, y: 400, id: 0 },
      { x: 600, y: 500, id: 1 },
    ],
  })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(page.getByRole('slider', { name: '时间表缩放' })).toHaveAttribute(
    'aria-valuenow',
    '57',
  )
  await page.locator('.nav-row', { hasText: '创建' }).click()
  await page.goto('/')
  await page.locator('.nav-row', { hasText: '时间表' }).click()
  await expect(page.getByRole('slider', { name: '时间表缩放' })).toHaveAttribute(
    'aria-valuenow',
    '57',
  )
})
