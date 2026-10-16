/**
 * Headless screenshots of the real React UI, used as the M1 acceptance evidence.
 *
 * The dev server is started here so the script is self-contained (`npm run screenshots`).
 */
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

import { chromium } from '@playwright/test'

const PORT = 1420
const BASE = `http://localhost:${PORT}`
const OUT = path.resolve('artifacts', 'screenshots')

async function waitForServer(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(BASE)
      if (response.ok) return
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 400))
  }
  throw new Error(`dev server did not answer on ${BASE} within ${timeoutMs}ms`)
}

async function main() {
  await mkdir(OUT, { recursive: true })

  const server = spawn('npm', ['run', 'dev'], {
    stdio: 'ignore',
    detached: true,
    env: { ...process.env, BROWSER: 'none' },
  })

  const stopServer = () => {
    try {
      if (server.pid !== undefined) process.kill(-server.pid, 'SIGTERM')
    } catch {
      server.kill('SIGTERM')
    }
  }

  try {
    await waitForServer()

    const browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      locale: 'zh-CN',
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      colorScheme: 'light',
    })
    const page = await context.newPage()

    const shot = async (name) => {
      await page.screenshot({ path: path.join(OUT, `${name}.png`) })
      console.log(`saved ${name}.png`)
    }

    await page.goto(`${BASE}/?reset=1`)
    await page.waitForSelector('.task-row')
    await shot('01-today-light')

    await page.locator('.nav-row', { hasText: '四象限' }).click()
    await page.waitForSelector('.group-board[data-arrangement="grid"]')
    await shot('02-quadrant-light')

    await page.locator('.toolbar .menu').first().locator('summary').click()
    await page.locator('.menu-panel .menu-item', { hasText: '深色' }).click()
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')
    await shot('03-quadrant-dark')

    await page.locator('.nav-row', { hasText: '全部任务' }).click()
    await shot('04-all-tasks-dark')

    await page.locator('.toolbar .menu').nth(1).locator('summary').click()
    await page.locator('.menu-panel .menu-item', { hasText: 'English' }).click()
    await page.locator('.nav-row', { hasText: 'Inbox' }).click()
    await shot('05-inbox-english-dark')

    await page.locator('.toolbar').getByRole('button', { name: 'Settings' }).click()
    await page.locator('dialog.settings-window').waitFor()
    await shot('06-settings-dark')
    await page.keyboard.press('Escape')

    await page.locator('.toolbar .primary').click()
    await page.locator('#task-title').fill('Screenshot: new task')
    await shot('07-task-dialog-dark')

    await browser.close()
    console.log(`screenshots written to ${OUT}`)
  } finally {
    stopServer()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
