import { createServer, type Server } from 'node:http'
import { test, expect, type Page } from '@playwright/test'
import { choose } from './helpers'

let server: Server, url: string, remote: string | null, revision: number, writes: number
let race = false
const authorization = 'Basic ' + Buffer.from('demo:app-password').toString('base64')
test.beforeEach(async () => {
  remote = null
  revision = 0
  writes = 0
  race = false
  server = createServer(async (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
    response.setHeader(
      'Access-Control-Allow-Headers',
      'Authorization, Content-Type, If-Match, If-None-Match',
    )
    response.setHeader('Access-Control-Expose-Headers', 'ETag')
    if (request.method === 'OPTIONS') {
      response.writeHead(204).end()
      return
    }
    if (request.headers.authorization !== authorization) {
      response.writeHead(401).end()
      return
    }
    if (request.url !== '/dav/pantodo-workspace.json') {
      response.writeHead(404).end()
      return
    }
    if (request.method === 'GET') {
      if (remote === null) response.writeHead(404).end()
      else {
        response.setHeader('ETag', `"${revision}"`)
        response.writeHead(200, { 'Content-Type': 'application/json' }).end(remote)
      }
      return
    }
    if (request.method === 'PUT') {
      let body = ''
      for await (const chunk of request) body += chunk
      if (race) {
        race = false
        revision++
        response.writeHead(412).end()
        return
      }
      if (
        (remote === null && request.headers['if-none-match'] !== '*') ||
        (remote !== null && request.headers['if-match'] !== `"${revision}"`)
      ) {
        response.writeHead(412).end()
        return
      }
      remote = body
      revision++
      writes++
      response.setHeader('ETag', `"${revision}"`)
      response.writeHead(204).end()
      return
    }
    response.writeHead(405).end()
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing server address')
  url = `http://127.0.0.1:${address.port}/dav/`
})
test.afterEach(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  )
})
async function openSync(page: Page) {
  await page.locator('.sidebar').getByRole('button', { name: '设置', exact: true }).click()
  await page.locator('.settings-nav').getByRole('button', { name: '同步', exact: true }).click()
}
async function configure(page: Page) {
  await openSync(page)
  await page.locator('#dav-url').fill(url)
  await page.locator('#dav-user').fill('demo')
  await page.locator('#dav-password').fill('app-password')
  await page.getByRole('button', { name: '保存配置', exact: true }).click()
}
async function sync(page: Page) {
  await page.getByRole('button', { name: '立即同步', exact: true }).click()
  await expect(page.locator('.sync-status-line strong')).toHaveText('同步完成')
}
async function closeSettings(page: Page) {
  await page.locator('.settings-footer').getByRole('button', { name: '关闭', exact: true }).click()
}
async function capture(page: Page, title: string) {
  await page.locator('.nav-row', { hasText: '创建' }).click()
  await page.locator('#pantodo-inbox-input').fill(title)
  await page.getByRole('button', { name: '记下来', exact: true }).click()
}
async function editTitle(page: Page, title: string) {
  await page.locator('.nav-row', { hasText: '全部任务' }).click()
  await page.locator('.task-body').first().click()
  await page.locator('#task-title').fill(title)
  await page.locator('button[form="pantodo-task-form"]').click()
}

test('web defaults to localStorage, persists reloads and makes no sync writes', async ({
  page,
}) => {
  await page.goto('/')
  await capture(page, '离线也要记下来')
  await page.reload()
  await page.locator('.nav-row', { hasText: '全部任务' }).click()
  await expect(page.locator('.task-row')).toContainText('离线也要记下来')
  await openSync(page)
  await expect(page.locator('.storage-summary')).toContainText('localStorage')
  await expect(page.locator('#dav-url')).toHaveValue('')
  await expect(page.locator('#dav-auto')).not.toBeChecked()
  expect(writes).toBe(0)
  expect(await page.evaluate(() => localStorage.getItem('pantodo.webdav.config'))).toBeNull()
})

test('real WebDAV sync merges two devices, asks about conflicts, and keeps credentials/timers local', async ({
  page,
  browser,
  baseURL,
}) => {
  await page.goto('/')
  await capture(page, '设备 A 的想法')
  await configure(page)
  await page.getByRole('button', { name: '测试连接', exact: true }).click()
  await expect(page.locator('.sync-status-line strong')).toContainText('连接可用')
  expect(writes).toBe(0)
  await sync(page)
  const context = await browser.newContext({
    baseURL,
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  })
  const second = await context.newPage()
  try {
    await second.goto('/')
    await capture(second, '设备 B 的想法')
    await configure(second)
    await sync(second)
    expect(Object.keys(JSON.parse(remote!).data.tasks)).toHaveLength(2)
    expect(Object.keys(JSON.parse(remote!).data.views)).toHaveLength(1)
    expect(remote).not.toContain('app-password')
    expect(JSON.parse(remote!)).not.toHaveProperty('timer')
    expect(JSON.parse(remote!).data).not.toHaveProperty('settings')
    await sync(page)
    await closeSettings(page)
    await closeSettings(second)
    await editTitle(page, 'A 离线修改相同任务')
    await editTitle(second, 'B 离线修改相同任务')
    await openSync(page)
    await sync(page)
    await openSync(second)
    const before = writes
    await second.getByRole('button', { name: '立即同步', exact: true }).click()
    await expect(second.locator('.sync-conflicts')).toBeVisible()
    expect(writes).toBe(before)
    await closeSettings(page)
    await editTitle(page, '远端在审阅期间再次修改')
    await openSync(page)
    await sync(page)
    await second.getByRole('button', { name: '保留远端的修改', exact: true }).click()
    await expect(second.locator('.sync-conflicts')).toBeVisible()
    await second.getByRole('button', { name: '保留远端的修改', exact: true }).click()
    await expect(second.locator('.sync-status-line strong')).toHaveText('同步完成')
    await closeSettings(second)
    await second.locator('.nav-row', { hasText: '全部任务' }).click()
    await expect(second.locator('.task-row', { hasText: '远端在审阅期间再次修改' })).toHaveCount(1)
  } finally {
    await context.close()
  }
})

test('authentication failures and malformed remote files leave local data untouched', async ({
  page,
}) => {
  await page.goto('/')
  await capture(page, '必须保留的任务')
  await configure(page)
  const snapshot = await page.evaluate(() => localStorage.getItem('pantodo.workspace.v2'))
  await page.locator('#dav-password').fill('incorrect')
  await page.getByRole('button', { name: '保存配置', exact: true }).click()
  await page.getByRole('button', { name: '立即同步', exact: true }).click()
  await expect(page.locator('.sync-status-line strong')).toContainText('认证失败')
  expect(await page.evaluate(() => localStorage.getItem('pantodo.workspace.v2'))).toBe(snapshot)
  await page.locator('#dav-password').fill('app-password')
  await page.getByRole('button', { name: '保存配置', exact: true }).click()
  remote = '<html>Sign in</html>'
  revision++
  await page.getByRole('button', { name: '立即同步', exact: true }).click()
  await expect(page.locator('.sync-status-line strong')).toContainText('远端文件格式不正确')
  expect(await page.evaluate(() => localStorage.getItem('pantodo.workspace.v2'))).toBe(snapshot)
  expect(writes).toBe(0)
})

test('retries conditional writes and propagates permanent deletion without resurrection', async ({
  page,
  browser,
  baseURL,
}) => {
  await page.goto('/')
  await capture(page, '稍后删除')
  await configure(page)
  await sync(page)
  const context = await browser.newContext({
    baseURL,
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  })
  const second = await context.newPage()
  try {
    await second.goto('/')
    await configure(second)
    await sync(second)
    await closeSettings(page)
    await editTitle(page, '已修改')
    race = true
    await openSync(page)
    await sync(page)
    expect(writes).toBe(2)
    remote = null
    revision++
    await sync(page)
    expect(Object.keys(JSON.parse(remote!).data.tasks)).toHaveLength(1)
    await closeSettings(page)
    await page.locator('.nav-row', { hasText: '全部任务' }).click()
    await page.locator('.task-row').first().hover()
    await page
      .locator('.task-row')
      .first()
      .getByRole('button', { name: '删除', exact: true })
      .click()
    await page.getByRole('dialog').getByRole('button', { name: '删除', exact: true }).click()
    await page.locator('.nav-row', { hasText: '回收站' }).click()
    await page.getByRole('button', { name: '清空回收站', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: '清空回收站', exact: true }).click()
    await openSync(page)
    await sync(page)
    await sync(second)
    await closeSettings(second)
    await second.locator('.nav-row', { hasText: '全部任务' }).click()
    await expect(second.locator('.task-row')).toHaveCount(0)
    expect(Object.values(JSON.parse(remote!).data.tasks)).toEqual([null])
    const file = remote
    await openSync(second)
    await second.getByRole('button', { name: '断开连接', exact: true }).click()
    expect(remote).toBe(file)
    expect(await second.evaluate(() => localStorage.getItem('pantodo.webdav.config'))).toBeNull()
  } finally {
    await context.close()
  }
})

test('view column count defaults to two and is edited only in view settings', async ({ page }) => {
  await page.goto('/?reset=1')
  await page.locator('.nav-row', { hasText: '我的工作台' }).click()
  await expect(page.locator('.panel-toolbar').getByRole('combobox')).toHaveCount(0)
  await expect(
    page.locator('.view-actions').getByRole('button', { name: '分栏', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: '视图设置', exact: true }).click()
  await expect(page.locator('#view-column-count')).toContainText('2')
  await choose(page, page.locator('#view-column-count'), '3')
  await page.locator('button[form="pantodo-view-form"]').click()
  await expect(page.locator('.composed-panels')).toHaveCSS('grid-template-columns', /\S+ \S+ \S+/)
  await page.goto('/')
  await page.locator('.nav-row', { hasText: '我的工作台' }).click()
  await expect
    .poll(() =>
      page
        .locator('.composed-panels')
        .evaluate((element) => element.style.getPropertyValue('--panel-columns')),
    )
    .toBe('3')
})

test('automatic sync waits for opt-in, avoids feedback loops, and catches up after offline edits', async ({
  page,
  context,
}) => {
  await page.clock.install({ time: new Date('2026-10-17T10:00:00Z') })
  await page.goto('/')
  await configure(page)
  await page.clock.runFor(2500)
  expect(writes).toBe(0)
  await page.locator('#dav-auto').check()
  await page.getByRole('button', { name: '保存配置', exact: true }).click()
  await page.clock.runFor(2500)
  await expect(page.locator('.sync-status-line strong')).toHaveText('同步完成')
  expect(writes).toBe(1)
  await page.clock.runFor(12000)
  expect(writes).toBe(1)
  await closeSettings(page)
  await context.setOffline(true)
  await capture(page, '离线编辑，联网同步')
  await page.clock.runFor(2500)
  expect(writes).toBe(1)
  await context.setOffline(false)
  await expect.poll(() => writes).toBe(2)
  expect(
    Object.values(JSON.parse(remote!).data.tasks).some(
      (value: unknown) =>
        (value as { task: { title: string } })?.task.title === '离线编辑，联网同步',
    ),
  ).toBe(true)
})
