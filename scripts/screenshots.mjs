/** Actual app captures from an isolated sample workspace, including completed time-entry flows. */
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'

const out = path.resolve('artifacts/screenshots')
await rm(out, { recursive: true, force: true })
await mkdir(out, { recursive: true })
const server = await createServer({ server: { host: '127.0.0.1', port: 1420 } })
await server.listen()
let browser
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {}),
  })
  const context = await browser.newContext({
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    viewport: { width: 1440, height: 1080 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
  })
  const page = await context.newPage(),
    errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.clock.install({ time: new Date('2026-10-19T16:00:00+08:00') })
  await page.goto(server.resolvedUrls.local[0] + '?reset=1')
  await page.locator('.capture-desk').waitFor()
  await page.evaluate(() => document.fonts.ready)
  const nav = async (name) => page.locator('.nav-row', { hasText: name }).first().click()
  const shot = async (name) => {
    await page.mouse.move(800, 25)
    await page.waitForTimeout(240)
    await page.screenshot({ path: path.join(out, name + '.png') })
    console.log('saved ' + name)
  }
  const choose = async (trigger, value) => {
    await trigger.click()
    await page.locator(`[role="option"][data-value="${value}"]`).click()
  }
  const theme = async (value) => {
    await page.getByRole('button', { name: '设置', exact: true }).click()
    await choose(page.getByRole('combobox', { name: '主题', exact: true }), value)
    await page.locator('.settings-footer .primary').click()
  }
  await shot('01-create')
  await page.locator('#pantodo-inbox-input').fill('读完今天的论文，整理笔记')
  await page.getByRole('button', { name: '时间与预估', exact: true }).click()
  await page.locator('#create-start').fill('2026-10-19T16:30')
  await page.locator('#create-end').fill('2026-10-19T18:00')
  await page.locator('#create-due').fill('2026-10-19T20:00')
  await page.locator('#create-estimate').fill('90')
  await shot('02-create-schedule')
  await page.getByRole('button', { name: '记下来', exact: true }).click()
  await nav('全部任务')
  await shot('03-todo-list')
  await page.locator('.task-start').first().click()
  await page.clock.runFor(6500)
  await page.locator('.focus-exit').click()
  await shot('04-working-timer')
  await page.locator('.work-timer').getByRole('button', { name: '专注', exact: true }).click()
  await shot('17-pane-focus')
  await page.locator('.focus-exit').click()
  await page.locator('.work-timer').getByRole('button', { name: '停止并保存', exact: true }).click()
  await nav('时间表')
  await shot('05-calendar-week')
  await page
    .getByRole('group', { name: '时间表视图' })
    .getByRole('button', { name: '月', exact: true })
    .click()
  await shot('06-calendar-month')
  await page
    .getByRole('group', { name: '时间表视图' })
    .getByRole('button', { name: '日', exact: true })
    .click()
  await shot('07-calendar-day')
  await nav('时间统计')
  const tasks = await page.evaluate(
    () => JSON.parse(localStorage.getItem('pantodo.workspace.v2')).tasks,
  )
  const sample = [
    ['2026-10-13T09:00', '2026-10-13T10:30', 0],
    ['2026-10-14T14:00', '2026-10-14T16:00', 1],
    ['2026-10-15T10:00', '2026-10-15T11:15', 4],
    ['2026-10-16T09:00', '2026-10-16T10:45', 1],
    ['2026-10-17T15:00', '2026-10-17T16:00', 4],
    ['2026-10-18T10:00', '2026-10-18T11:30', 0],
    ['2026-10-19T09:00', '2026-10-19T11:00', 4],
  ]
  for (const [start, end, index] of sample) {
    await page.getByRole('button', { name: '补录时间', exact: true }).click()
    await choose(page.locator('#entry-task'), tasks[index].id)
    await page.locator('#entry-start').fill(start)
    await page.locator('#entry-end').fill(end)
    await page.locator('button[form="time-entry-form"]').click()
  }
  await shot('08-statistics')
  await page.getByRole('button', { name: '补录时间', exact: true }).click()
  await choose(page.locator('#entry-task'), tasks[1].id)
  await page.locator('#entry-start').fill('2026-10-19T13:00')
  await page.locator('#entry-end').fill('2026-10-19T14:30')
  await page.locator('#entry-note').fill('补录下午的设计评审，整理时间表交互。')
  await shot('09-manual-entry')
  await page.getByRole('dialog').getByRole('button', { name: '关闭', exact: true }).click()
  await nav('我的工作台')
  await shot('10-workbench')
  const modes = page.getByRole('group', { name: '展示方式', exact: true })
  await modes.getByRole('button', { name: '画廊', exact: true }).click()
  await shot('18-gallery')
  await modes.getByRole('button', { name: '看板', exact: true }).click()
  await shot('19-board')
  await modes.getByRole('button', { name: '面板', exact: true }).click()
  await page.getByRole('button', { name: '视图设置', exact: true }).click()
  await shot('20-view-editor')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: '新建视图', exact: true }).click()
  await shot('21-view-create')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: '添加面板', exact: true }).click()
  await page.locator('#panel-name').fill('论文与深度工作')
  await page.locator('.emoji-trigger').click()
  await page.getByRole('button', { name: '📚', exact: true }).click()
  await shot('11-panel-editor')
  await page.getByRole('dialog').getByRole('button', { name: '关闭', exact: true }).click()
  await theme('dark')
  await nav('创建')
  await shot('12-create-dark')
  await theme('light')
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await shot('13-settings')
  await page.locator('.settings-footer .primary').click()
  await page.setViewportSize({ width: 960, height: 640 })
  await nav('时间表')
  await shot('14-calendar-small')
  await nav('我的工作台')
  await shot('15-workbench-small')
  await nav('时间统计')
  await shot('16-statistics-small')
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth > window.innerWidth,
    panels: [...document.querySelectorAll('.composed-panel')].some(
      (el) => el.scrollWidth > el.clientWidth,
    ),
  }))
  if (errors.length || overflow.document || overflow.panels)
    throw new Error(JSON.stringify({ errors, overflow }))
  console.log('No runtime errors or horizontal overflow.')
} finally {
  await browser?.close()
  await server.close()
}
