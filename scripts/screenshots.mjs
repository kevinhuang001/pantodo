/** Review the actual React pages in light/dark and desktop/minimum window sizes. */
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

import { chromium } from '@playwright/test'
import { createServer } from 'vite'

const out = path.resolve('artifacts/screenshots')
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
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(server.resolvedUrls.local[0] + '?reset=1')
  await page.locator('.capture-desk').waitFor()
  await page.evaluate(() => document.fonts.ready)
  const shot = async (name) => {
    await page.mouse.move(1400, 25)
    await page.waitForTimeout(240)
    await page.screenshot({ path: path.join(out, name + '.png') })
    console.log('saved ' + name)
  }
  const nav = async (name) => {
    await page.locator('.nav-row', { hasText: name }).first().click()
  }
  await shot('01-create')
  await nav('全部任务')
  await shot('02-todo-list')
  await nav('我的工作台')
  await shot('03-workbench')
  await nav('创建')
  await page.locator('.toolbar .menu').first().locator('summary').click()
  await page.locator('.menu-item', { hasText: '深色' }).click()
  await shot('04-create-dark')
  await page.locator('.toolbar .menu').first().locator('summary').click()
  await page.locator('.menu-item', { hasText: '浅色' }).click()
  await page.setViewportSize({ width: 960, height: 640 })
  await shot('05-create-small')
  await nav('我的工作台')
  await shot('06-workbench-small')
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth > window.innerWidth,
    panels: [...document.querySelectorAll('.preview-panel')].some(
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
