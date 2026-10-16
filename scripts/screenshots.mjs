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

    const pickTheme = async (label) => {
      await page.locator('.toolbar .menu').first().locator('summary').click()
      await page.locator('.menu-panel .menu-item', { hasText: label }).click()
      await page.waitForTimeout(120)
    }

    const pickLanguage = async (label) => {
      await page.locator('.toolbar .menu').nth(1).locator('summary').click()
      await page.locator('.menu-panel .menu-item', { hasText: label }).click()
      await page.waitForTimeout(120)
    }

    const openView = async (label) => {
      await page.locator('.tabs .tab').first().click()
      await page.locator('.nav-row', { hasText: label }).first().click()
      await page.waitForTimeout(150)
    }

    await page.goto(`${BASE}/?reset=1`)
    await page.waitForSelector('.task-row')

    // --- views, light -------------------------------------------------------
    await shot('today-light')
    await openView('收件箱')
    await shot('inbox-light')
    await openView('即将到来')
    await shot('upcoming-light')
    await openView('全部任务')
    await shot('all-tasks-light')

    // --- the quadrant, the three arrangements ------------------------------
    await openView('四象限')
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

    // --- custom view manager ----------------------------------------------
    await page.locator('.tabs .tab').first().click()
    await page
      .locator('.sidebar-section', { hasText: '我的视图' })
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
    await page.waitForTimeout(200)
    await shot('custom-view-created')

    // --- task dialogs ------------------------------------------------------
    await page.locator('.toolbar .primary').click()
    await page.locator('#task-title').fill('准备下周的路线图评审')
    await page.locator('#task-notes').fill('整理三个候选方向，各给一个取舍建议。')
    await page.locator('#task-estimate').fill('45')
    await shot('task-dialog-new')
    await page.locator('button[form="pantodo-task-form"]').click()
    await page.waitForTimeout(150)

    await openView('全部任务')
    const row = page.locator('.task-row').first()
    await row.hover()
    await row.locator('button[aria-label="编辑"]').click()
    await shot('task-dialog-edit')
    await page.locator('.dialog-header .icon-button').click()

    // --- project + tag dialogs --------------------------------------------
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
    await openView('全部任务')
    const trashRow = page.locator('.task-row').last()
    await trashRow.hover()
    await trashRow.locator('button[aria-label="删除"]').click()
    await page.locator('.dialog .danger-button').click()
    await page.waitForTimeout(150)
    await openView('回收站')
    await shot('trash-with-item')

    // --- search + empty state ---------------------------------------------
    await page.locator('#pantodo-search').fill('zzz-没有结果')
    await shot('search-empty')
    await page.locator('#pantodo-search').fill('')

    // --- timetable tab -----------------------------------------------------
    await page.locator('.tabs .tab').nth(1).click()
    await page.waitForTimeout(150)
    await shot('timetable-tab')

    // --- settings, all six panes (dark) ------------------------------------
    await pickTheme('深色')
    await page.locator('.sidebar').getByRole('button', { name: '设置' }).click()
    await page.locator('dialog.settings-window').waitFor()
    const panes = ['通用', '提醒', '计时', '同步', '数据', '关于']
    for (const pane of panes) {
      await page.locator('.settings-nav button', { hasText: pane }).click()
      await page.waitForTimeout(120)
      await shot(`settings-${pane}`)
    }
    await page.locator('.settings-footer .primary').click()

    // --- dark views --------------------------------------------------------
    await openView('四象限')
    await shot('quadrant-dark')
    await openView('今天')
    await shot('today-dark')

    // --- English, dark -----------------------------------------------------
    await pickLanguage('English')
    await page.waitForTimeout(150)
    await shot('today-dark-english')

    await pickTheme('Light')
    await pickLanguage('简体中文')
    await page.waitForTimeout(150)
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
