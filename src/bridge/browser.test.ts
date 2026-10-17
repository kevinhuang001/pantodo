import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSeedWorkspace } from '@/domain/presets'
import { createBrowserBridge, STORAGE_KEY } from './browser'

const memory = new Map<string, string>()
beforeEach(() => {
  memory.clear()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
  })
})
afterEach(() => vi.unstubAllGlobals())
describe('atomic workspace persistence', () => {
  it('starts clean outside the explicit sample workspace', async () => {
    const bridge = createBrowserBridge()
    const workspace = await bridge.load()
    expect(workspace.tasks).toEqual([])
    expect(workspace.timeEntries).toEqual([])
  })
  it('does not partially replace time records when persistence fails', async () => {
    const workspace = createSeedWorkspace({ withDemoData: true })
    memory.set(STORAGE_KEY, JSON.stringify(workspace))
    const bridge = createBrowserBridge()
    await bridge.load()
    const before = memory.get(STORAGE_KEY)
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: () => {
        throw new Error('disk full')
      },
    })
    expect(() => bridge.timeCommand({ kind: 'start', taskId: workspace.tasks[0]!.id })).toThrow(
      'disk full',
    )
    expect(memory.get(STORAGE_KEY)).toBe(before)
    expect(bridge.loadSync().timer).toBeNull()
  })
})
