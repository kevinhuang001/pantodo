import { afterEach, expect, it, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { createSeedWorkspace } from '@/domain/presets'
import type { Workspace } from '@/domain/types'
import { extractData } from '@/sync/model'
import { STORAGE_KEY } from './browser'
import { createTauriBridge } from './tauri'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})
it('reapplies synced data after a native generation cutoff without restoring the timer', async () => {
  const memory = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
  })
  vi.stubGlobal('window', { location: { search: '' }, dispatchEvent: vi.fn() })
  vi.stubGlobal(
    'StorageEvent',
    class {
      constructor(
        public type: string,
        public options: unknown,
      ) {}
    },
  )
  const w = createSeedWorkspace({ withDemoData: true })
  w.timer = {
    taskId: w.tasks[0].id,
    startedAt: '2026-10-17T08:00:00Z',
    lastHeartbeatAt: '2026-10-17T08:00:05Z',
    elapsedSeconds: 0,
    entryIds: [],
    ownerId: 'local-window',
  }
  memory.set(STORAGE_KEY, JSON.stringify(w))
  const previous = extractData(w),
    remote = structuredClone(previous)
  remote.tasks[w.tasks[1].id]!.task.title = 'Incoming remote edit'
  const cutoff: Workspace = {
    ...w,
    timer: null,
    timeEntries: [
      {
        id: 'native-cutoff',
        taskId: w.tasks[0].id,
        createdAt: '2026-10-17T08:00:10Z',
        updatedAt: '2026-10-17T08:00:10Z',
        deletedAt: null,
        startedAt: '2026-10-17T08:00:00Z',
        endedAt: '2026-10-17T08:00:10Z',
        source: 'timer',
        note: '',
      },
    ],
  }
  vi.mocked(invoke)
    .mockResolvedValueOnce({ workspace: cutoff, generation: 1 })
    .mockImplementationOnce(async (_command, args) => ({
      workspace: (args as { workspace: Workspace }).workspace,
      generation: 1,
    }))
  const bridge = createTauriBridge()
  await bridge.applySync(remote, previous)
  expect(invoke).toHaveBeenCalledTimes(2)
  const last = vi.mocked(invoke).mock.calls[1][1] as { workspace: Workspace; generation: number }
  expect(last.generation).toBe(1)
  expect(last.workspace.timer).toBeNull()
  expect(last.workspace.timeEntries[0].id).toBe('native-cutoff')
  expect(last.workspace.tasks.find((task) => task.id === w.tasks[1].id)?.title).toBe(
    'Incoming remote edit',
  )
  expect(bridge.loadSync()).toEqual(last.workspace)
})
