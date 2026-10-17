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
  it('migrates a prior planned interval onto its Todo and removes the old entity', async () => {
    const workspace = createSeedWorkspace({ withDemoData: true })
    const todo = workspace.tasks[0]!
    const old = {
      ...workspace,
      tasks: workspace.tasks.map((task) => ({ ...task, startAt: undefined, endAt: undefined })),
      scheduleBlocks: [
        {
          taskId: todo.id,
          startAt: '2026-10-19T02:00:00.000Z',
          endAt: '2026-10-19T03:00:00.000Z',
          deletedAt: null,
        },
      ],
    }
    memory.set(STORAGE_KEY, JSON.stringify(old))
    const loaded = await createBrowserBridge().load()
    expect(loaded.tasks[0]?.startAt).toBe('2026-10-19T02:00:00.000Z')
    expect('scheduleBlocks' in loaded).toBe(false)
    expect('scheduleBlocks' in JSON.parse(memory.get(STORAGE_KEY)!)).toBe(false)
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
