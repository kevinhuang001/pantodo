import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { extractData } from '@/sync/model'
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

describe('sync persistence and local timer ownership', () => {
  it('retains the local active timer while merging other tasks', async () => {
    const w = createSeedWorkspace({ withDemoData: true })
    memory.set(STORAGE_KEY, JSON.stringify(w))
    const bridge = createBrowserBridge()
    await bridge.load()
    bridge.timeCommand({ kind: 'start', taskId: w.tasks[0].id })
    const before = bridge.loadSync(),
      data = extractData(before)
    const remote = structuredClone(data)
    remote.tasks[w.tasks[1].id]!.task.title = 'Remote title'
    await bridge.applySync(remote, data)
    const after = bridge.loadSync()
    expect(after.timer).toEqual(before.timer)
    expect(after.tasks.find((task) => task.id === w.tasks[1].id)?.title).toBe('Remote title')
  })
  it.each(['delete', 'done', 'cancelled', 'archive'] as const)(
    'commits active work before applying remote %s of the running Todo',
    async (action) => {
      const w = createSeedWorkspace({ withDemoData: true })
      memory.set(STORAGE_KEY, JSON.stringify(w))
      const bridge = createBrowserBridge()
      await bridge.load()
      vi.useFakeTimers()
      try {
        vi.setSystemTime(new Date('2026-10-17T08:00:00Z'))
        bridge.timeCommand({ kind: 'start', taskId: w.tasks[0].id })
        const data = extractData(bridge.loadSync()),
          remote = structuredClone(data)
        if (action === 'delete') remote.tasks[w.tasks[0].id] = null
        else if (action === 'archive')
          remote.tasks[w.tasks[0].id]!.task.archivedAt = '2026-10-17T08:00:10Z'
        else remote.tasks[w.tasks[0].id]!.task.status = action
        vi.setSystemTime(new Date('2026-10-17T08:00:10Z'))
        await bridge.applySync(remote, data)
        const after = bridge.loadSync()
        expect(after.timer).toBeNull()
        expect(after.tasks.some((task) => task.id === w.tasks[0].id)).toBe(action !== 'delete')
        expect(after.timeEntries).toHaveLength(1)
        expect(after.timeEntries[0].endedAt).toBe('2026-10-17T08:00:10.000Z')
      } finally {
        vi.useRealTimers()
      }
    },
  )
})
