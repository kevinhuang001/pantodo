import { test, expect } from '@playwright/test'

test('native platform controls, title dragging and all eight resize edges dispatch OS commands', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as unknown as Record<string, unknown>
    const calls: { command: string; args: Record<string, unknown> }[] = []
    state.__windowCalls = calls
    state.__TAURI_INTERNALS__ = {
      metadata: { currentWindow: { label: 'main' }, currentWebview: { label: 'main' } },
      transformCallback: () => Math.floor(Math.random() * 100000),
      invoke: async (command: string, args: Record<string, unknown> = {}) => {
        calls.push({ command, args })
        if (command === 'desktop_platform') return 'macos'
        if (command === 'load_workspace') return { workspace: null, generation: 0 }
        if (command === 'save_workspace') return { workspace: args.workspace, generation: 0 }
        if (command === 'plugin:window|is_maximized') return false
        if (command === 'plugin:event|listen') return 1
        return null
      },
    }
    state.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener: () => {} }
  })
  await page.goto('/?reset=1')
  await expect(page.locator('.capture-desk')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-platform', 'macos')
  await expect(page.locator('.window-chrome.is-mac .window-control')).toHaveCount(3)
  expect(
    await page
      .locator('.window-control.close')
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe('rgb(255, 95, 87)')
  await page.getByRole('button', { name: '最小化', exact: true }).click()
  await page.getByRole('button', { name: '最大化', exact: true }).click()
  await page.locator('.window-drag').click({ position: { x: 320, y: 20 } })
  for (const edge of [
    'North',
    'NorthEast',
    'East',
    'SouthEast',
    'South',
    'SouthWest',
    'West',
    'NorthWest',
  ])
    await page.locator(`[data-resize-edge="${edge}"]`).click()
  await page.getByRole('button', { name: '关闭窗口', exact: true }).click()
  const calls = await page.evaluate(
    () =>
      (window as unknown as { __windowCalls: { command: string; args: { value?: string } }[] })
        .__windowCalls,
  )
  const commands = calls.map((call) => call.command)
  expect(commands).toContain('plugin:window|minimize')
  expect(commands).toContain('plugin:window|toggle_maximize')
  expect(commands).toContain('plugin:window|start_dragging')
  expect(commands).toContain('plugin:window|close')
  expect(
    calls
      .filter((call) => call.command === 'plugin:window|start_resize_dragging')
      .map((call) => call.args.value)
      .sort(),
  ).toEqual(['East', 'North', 'NorthEast', 'NorthWest', 'South', 'SouthEast', 'SouthWest', 'West'])
})
