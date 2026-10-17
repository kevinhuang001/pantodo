/** Capture the current product with disposable, clearly fictional sample content. */
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'

const server = await createServer({ server: { host: '127.0.0.1', port: 1421 } })
await server.listen()
let browser
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {}),
  })
  const page = await browser.newPage({
    locale: 'en-US',
    timezoneId: 'Asia/Shanghai',
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.clock.install({ time: new Date('2026-10-19T09:00:00+08:00') })
  await page.goto(server.resolvedUrls.local[0] + '?reset=1')
  await page.locator('.capture-desk').waitFor()
  await page.evaluate(async () => {
    const { useAppStore } = await import('/src/domain/store.ts')
    await useAppStore.getState().updateSettings({ localePreference: 'en', accentColor: 'ocean' })
    const state = useAppStore.getState()
    const titles = [
      'Shape the next release',
      'Read and annotate a research paper',
      'Review the experiment results',
      'Plan the week ahead',
      'Make room for a long walk',
      'Pick up a few groceries',
      'Book a table for Friday',
      'Send the weekly update',
    ]
    const notes = [
      'Refine the details that make everyday planning feel effortless.',
      'Collect the key findings and write down questions for the next meeting.',
      'Compare the latest measurements with last week’s baseline.',
      'Choose three priorities and leave space for unexpected ideas.',
      'Step outside, clear the mind, and come back refreshed.',
      'Coffee, fresh fruit and something good for dinner.',
      'A small celebration with friends.',
      'Summarize the progress and the next steps.',
    ]
    for (const [i, task] of state.tasks.entries())
      await state.updateTask(task.id, {
        title: titles[i % titles.length],
        notes: notes[i % notes.length],
        ...(i === 0 || i === 1 ? { status: 'doing' } : {}),
      })
    for (const [i, project] of state.projects.entries())
      await state.updateProject(project.id, { name: ['Studio', 'Personal'][i % 2] })
    for (const [i, tag] of state.tags.entries())
      await state.updateTag(tag.id, { name: ['Priority', 'Research', 'Deep work', 'Home'][i % 4] })
    for (const view of state.views.filter((view) => !view.builtin))
      await state.updateView(view.id, {
        name: 'My workbench',
        panels: view.panels.map((panel, i) => ({
          ...panel,
          name: ['Today’s focus', 'Outside the studio', 'Small wins'][i % 3],
          presentation: i === 1 ? 'gallery' : 'list',
        })),
      })
    for (let i = 0; i < 6; i++) {
      const day = 13 + i,
        stamp = new Date().toISOString()
      state.timeCommand({
        kind: 'save',
        entry: {
          id: 'demo-work-' + i,
          taskId: state.tasks[i % 3].id,
          startedAt: new Date(`2026-10-${day}T09:00:00+08:00`).toISOString(),
          endedAt: new Date(
            `2026-10-${day}T${[11, 12, 10, 11, 13, 11][i]}:30:00+08:00`,
          ).toISOString(),
          note: ['Release planning', 'Research and notes', 'Experiment review'][i % 3],
          source: 'manual',
          createdAt: stamp,
          updatedAt: stamp,
          deletedAt: null,
        },
      })
    }
  })
  await mkdir('docs/images', { recursive: true })
  const shot = async (name) => {
    await page.evaluate(async () => {
      const { useAppStore } = await import('/src/domain/store.ts')
      useAppStore.getState().dismissToast()
    })
    await page.mouse.move(1000, 20)
    await page.waitForTimeout(350)
    await page.evaluate(() => document.fonts.ready)
    if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth))
      throw new Error('Horizontal overflow')
    await page.screenshot({
      path: path.join('docs/images', name + '.jpg'),
      type: 'jpeg',
      quality: 87,
    })
    console.log('saved ' + name)
  }
  const nav = async (name) => page.locator('.nav-row', { hasText: name }).first().click()
  await page.locator('#pantodo-inbox-input').fill('A little progress, every day')
  await page
    .locator('.capture-notes')
    .fill('Turn a good idea into a plan. Start with one small step.')
  await shot('create')
  await page.getByRole('button', { name: 'Schedule', exact: true }).click()
  await page.locator('[data-endpoint=start] [data-part=date]').click()
  await page.locator('.date-popover button[data-day="10/19/2026"]').click()
  await page.getByRole('button', { name: 'Block duration', exact: true }).click()
  await shot('duration-picker')
  await page.getByRole('button', { name: 'Custom', exact: true }).click()
  await page
    .locator('.duration-custom-dialog')
    .getByRole('spinbutton', { name: 'Hour', exact: true })
    .fill('1')
  await page
    .locator('.duration-custom-dialog')
    .getByRole('spinbutton', { name: 'Minute', exact: true })
    .fill('25')
  await shot('custom-duration')
  await page
    .locator('.duration-custom-dialog')
    .getByRole('button', { name: 'Cancel', exact: true })
    .click()
  await page.locator('.estimate-presets button').nth(4).click()
  await shot('schedule')
  await page.locator('[data-endpoint=start] [data-part=time]').click()
  await shot('time-picker')
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await nav('Timetable')
  await shot('timetable')
  await nav('My workbench')
  await shot('views')
  await nav('Time statistics')
  await shot('statistics')
  await page.evaluate(async () => {
    const { useAppStore } = await import('/src/domain/store.ts')
    await useAppStore.getState().updateSettings({ theme: 'dark', accentColor: 'lavender' })
  })
  await nav('My workbench')
  await shot('dark')
  if (errors.length) throw new Error(errors.join('\n'))
} finally {
  await browser?.close()
  await server.close()
}
