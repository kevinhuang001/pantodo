import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import type { Workspace } from '@/domain/types'
import { createBrowserBridge, STORAGE_KEY } from './browser'
import type { Bridge } from './types'

interface Snapshot {
  workspace: Workspace | null
  generation: number
}

/** The webview has an immediate cache; the native file owns lifecycle and restart recovery. */
export function createTauriBridge(): Bridge {
  const cache = createBrowserBridge(false)
  let generation = 0
  let pending: Promise<void> = Promise.resolve()
  const report = (error: unknown) =>
    window.dispatchEvent(new CustomEvent('pantodo:storage-error', { detail: String(error) }))
  const accept = (snapshot: Snapshot) => {
    generation = snapshot.generation
    if (snapshot.workspace) localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot.workspace))
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }))
  }
  const persist = () => {
    const workspace = cache.loadSync()
    const epoch = generation
    const save = pending
      .catch(() => undefined)
      .then(async () => {
        const result = await invoke<Snapshot>('save_workspace', { workspace, generation: epoch })
        // Old writes queued before a native cutoff cannot resurrect the timer.
        if (result.generation > generation) accept(result)
      })
    pending = save
    void save.catch(report)
    return save
  }
  return {
    ...cache,
    kind: 'tauri',
    async load() {
      await listen<Snapshot>('pantodo:workspace', (event) => accept(event.payload))
      await listen<string>('pantodo:storage-error', (event) => report(event.payload))
      const snapshot = await invoke<Snapshot>('load_workspace')
      generation = snapshot.generation
      if (snapshot.workspace) localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot.workspace))
      const workspace = await cache.load()
      await persist()
      return workspace
    },
    async applySync(data, previous) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const epoch = generation
        await cache.applySync(data, previous)
        await persist()
        if (epoch === generation) return
        // A native sleep/exit cutoff can reject a queued write. Reapply the data
        // against that newer snapshot while preserving its committed timer segment.
      }
      throw new Error('sync.storage')
    },
    async upsertProject(value) {
      await cache.upsertProject(value)
      await persist()
    },
    async upsertTag(value) {
      await cache.upsertTag(value)
      await persist()
    },
    async upsertTask(value) {
      await cache.upsertTask(value)
      await persist()
    },
    async upsertView(value) {
      await cache.upsertView(value)
      await persist()
    },
    async setTaskTags(id, tags) {
      await cache.setTaskTags(id, tags)
      await persist()
    },
    async saveSettings(value) {
      await cache.saveSettings(value)
      await persist()
    },
    async purgeTasks(ids) {
      await cache.purgeTasks(ids)
      await persist()
    },
    timeCommand(command) {
      const result = cache.timeCommand(command)
      void persist()
      return result
    },
  }
}
