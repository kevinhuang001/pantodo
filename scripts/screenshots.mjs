/**
 * Headless screenshots of every screen, used as the acceptance evidence for the UI.
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
    let index = 0

    const shot = async (name) => {
      index += 1
      const file = `${String(index).padStart(2, '0')}-${name}.png`
      await page.screenshot({ path: path.join(OUT, file) })
      console.log(`saved ${file}`)
    }

    const nav = async (label) => {
      await page.locator('.nav-row', { hasText: label }).first().click()
      await page.waitForTimeout(180)
    }

    const pickTheme = async (label) => {
      await page.locator('.toolbar .menu').first().locator('summary').click()
      await page.locator('.menu-panel .menu-item', { hasText: label }).click()
      await page.waitForTimeout(140)
    }

    const pickLanguage = async (label) => {
      await page.locator('.toolbar .menu').nth(1).locator('summary').click()
      await page.locator('.menu-panel .menu-item', { hasText: label }).click()
      await page.waitForTimeout(140)
    }

    await page.goto(`${BASE}/?reset=1`)
    await page.waitForSelector('.task-row')

    // --- views, light -------------------------------------------------------
    await shot('today-light')
    await nav('收件箱')
    await page.locator('#pantodo-inbox-input').fill('给下周的评审准备提纲')
    await shot('inbox-light-composer')
    await page.locator('#pantodo-inbox-input').fill('')
    await nav('全部任务')
    await shot('all-tasks-light')

    // --- the Eisenhower view: three arrangements ---------------------------
    await nav('四象限')
    await shot('quadrant-grid-light')
    await page
      .getByRole('group', { name: '排列方式' })
      .getByRole('button', { name: '横向' })
      .click()
    await shot('quadrant-columns-light')
    await page
      .getByRole('group', { name: '排列方式' })
      .getByRole('button', { name: '纵向' })
      .click()
    await shot('quadrant-vertical-light')
    await page
      .getByRole('group', { name: '排列方式' })
      .getByRole('button', { name: '网格' })
      .click()

    // --- view editor -------------------------------------------------------
    await page
      .locator('.sidebar-section', { hasText: '视图' })
      .getByRole('button', { name: '新建视图' })
      .click()
    await page.locator('#view-name').fill('本周要紧事')
    await page.locator('#view-group').selectOption('tag')
    await page.locator('#view-arrangement').selectOption('columns')
    await page
      .locator('#pantodo-view-form')
      .getByRole('button', { name: '重要', exact: true })
      .click()
    await shot('view-dialog')
    await page.locator('button[form="pantodo-view-form"]').click()
    await page.waitForTimeout(220)
    await shot('custom-view-created')

    // --- dialogs -----------------------------------------------------------
    await nav('全部任务')
    const firstRow = page.locator('.task-row').first()
    await firstRow.hover()
    await firstRow.locator('button[aria-label="编辑"]').click()
    await shot('task-dialog-edit')
    await page.locator('.dialog-header .icon-button').click()

    await page
      .locator('.sidebar-section', { hasText: '项目' })
      .getByRole('button', { name: '新建项目' })
      .click()
    await page.locator('#entity-name').fill('个人')
    await shot('project-dialog')
    await page.locator('.dialog-header .icon-button').click()

    await page
      .locator('.sidebar-section', { hasText: '标签' })
      .getByRole('button', { name: '新建标签' })
      .click()
    await page.locator('#entity-name').fill('等待他人')
    await shot('tag-dialog')
    await page.locator('.dialog-header .icon-button').click()

    // --- trash with content ------------------------------------------------
    await nav('全部任务')
    const trashRow = page.locator('.task-row').last()
    await trashRow.hover()
    await trashRow.locator('button[aria-label="删除"]').click()
    await page.locator('.dialog .danger-button').click()
    await page.waitForTimeout(160)
    await nav('回收站')
    await shot('trash-with-item')

    // --- search ------------------------------------------------------------
    await page.locator('#pantodo-search').fill('zzz-没有结果')
    await shot('search-empty')
    await page.locator('#pantodo-search').fill('')

    // --- timetable: default (roomy) and zoomed -----------------------------
    await nav('时间表')
    await shot('timetable-week-roomy')
    await page.getByRole('group', { name: '缩放' }).getByRole('button', { name: '紧凑' }).click()
    await page.waitForTimeout(180)
    await shot('timetable-week-compact')
    await page.getByRole('group', { name: '缩放' }).getByRole('button', { name: '宽松' }).click()
    await page.waitForTimeout(180)

    // --- settings, all six panes (dark) ------------------------------------
    await pickTheme('深色')
    await page.locator('.sidebar').getByRole('button', { name: '设置' }).click()
    await page.locator('dialog.settings-window').waitFor()
    for (const pane of ['通用', '提醒', '计时', '同步', '数据', '关于']) {
      await page.locator('.settings-nav button', { hasText: pane }).click()
      await page.waitForTimeout(130)
      await shot(`settings-${pane}`)
    }
    await page.locator('.settings-footer .primary').click()

    // --- dark -----------------------------------------------------------------
    await nav('四象限')
    await shot('quadrant-dark')
    await nav('收件箱')
    await shot('inbox-dark')
    await nav('今天')
    await shot('today-dark')
    await nav('时间表')
    await shot('timetable-week-dark')

    // --- English, dark --------------------------------------------------------
    await pickLanguage('English')
    await page.waitForTimeout(160)
    await shot('timetable-dark-english')

    await pickTheme('Light')
    await pickLanguage('简体中文')
    await page.waitForTimeout(160)
    await shot('today-light-restored')

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
