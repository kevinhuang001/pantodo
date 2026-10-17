import { create } from 'zustand'
import { createSeedWorkspace } from '@/domain/presets'
import { useAppStore, workspaceBridge } from '@/domain/store'
import {
  emptyData,
  extractData,
  fingerprint,
  mergeData,
  parseDocument,
  type SyncConflict,
  type SyncData,
} from './model'
import { checkStatus, davRequest, strongEtag, syncFileUrl, type WebDavConfig } from './transport'
import type { MessageKey } from '@/i18n'

export const SYNC_CONFIG_KEY = 'pantodo.webdav.config'
export const SYNC_PROVIDER_KEY = 'pantodo.sync.provider'
export const SYNC_BASE_KEY = 'pantodo.webdav.base'
export const DEFAULT_CONFIG: WebDavConfig = { url: '', username: '', password: '', autoSync: false }
interface SavedBase {
  endpoint: string
  data: SyncData
  lastSyncAt: string
}
function readConfig(): WebDavConfig {
  try {
    const config = JSON.parse(
      localStorage.getItem(SYNC_CONFIG_KEY) ?? 'null',
    ) as WebDavConfig | null
    return config &&
      typeof config.url === 'string' &&
      typeof config.username === 'string' &&
      typeof config.password === 'string' &&
      typeof config.autoSync === 'boolean'
      ? config
      : DEFAULT_CONFIG
  } catch {
    return DEFAULT_CONFIG
  }
}
function endpoint(config: WebDavConfig) {
  return syncFileUrl(config.url) + '\n' + config.username
}
function readBase(config: WebDavConfig): SavedBase | null {
  try {
    const saved = JSON.parse(localStorage.getItem(SYNC_BASE_KEY) ?? 'null') as SavedBase | null
    if (saved?.endpoint !== endpoint(config)) return null
    parseDocument(JSON.stringify({ format: 'pantodo-webdav', version: 1, data: saved.data }))
    return saved
  } catch {
    return null
  }
}
interface SyncState {
  config: WebDavConfig
  provider: 'local' | 'webdav'
  selectProvider: (provider: 'local' | 'webdav') => void
  busy: boolean
  status: 'idle' | 'testing' | 'connected' | 'syncing' | 'success' | 'conflict' | 'error'
  error: MessageKey | null
  lastSyncAt: string | null
  conflicts: SyncConflict[]
  save: (config: WebDavConfig) => void
  disconnect: () => void
  test: (config: WebDavConfig) => Promise<void>
  sync: (choice?: 'local' | 'remote') => Promise<void>
}
const initialConfig = readConfig()
export const useSyncStore = create<SyncState>()((set, get) => ({
  config: initialConfig,
  provider: (() => {
    try {
      const saved = localStorage.getItem(SYNC_PROVIDER_KEY)
      return saved === 'local' || saved === 'webdav'
        ? saved
        : initialConfig.url
          ? 'webdav'
          : 'local'
    } catch {
      return 'local'
    }
  })(),
  selectProvider(provider) {
    if (get().busy) return
    localStorage.setItem(SYNC_PROVIDER_KEY, provider)
    set({ provider, status: 'idle', error: null })
  },
  busy: false,
  status: 'idle',
  error: null,
  lastSyncAt: readBase(initialConfig)?.lastSyncAt ?? null,
  conflicts: [],
  save(config) {
    if (get().busy) return
    syncFileUrl(config.url)
    localStorage.setItem(SYNC_PROVIDER_KEY, 'webdav')
    localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config))
    set({
      config,
      provider: 'webdav',
      status: 'idle',
      error: null,
      conflicts: [],
      lastSyncAt: readBase(config)?.lastSyncAt ?? null,
    })
  },
  disconnect() {
    if (get().busy) return
    localStorage.setItem(SYNC_PROVIDER_KEY, 'local')
    localStorage.removeItem(SYNC_CONFIG_KEY)
    localStorage.removeItem(SYNC_BASE_KEY)
    set({
      config: DEFAULT_CONFIG,
      provider: 'local',
      status: 'idle',
      error: null,
      conflicts: [],
      lastSyncAt: null,
    })
  },
  async test(config) {
    if (get().busy) return
    set({ busy: true, status: 'testing', error: null })
    try {
      const response = await davRequest(config, 'GET')
      if (response.status !== 404) {
        checkStatus(response.status)
        parseDocument(response.body)
        if (!strongEtag(response.etag)) throw new Error('sync.noEtag')
      }
      set({ status: 'connected' })
    } catch (error) {
      set({ status: 'error', error: syncError(error) })
    } finally {
      set({ busy: false })
    }
  },
  async sync(choice) {
    if (
      get().provider !== 'webdav' ||
      get().busy ||
      !get().config.url ||
      !useAppStore.getState().ready
    )
      return
    const config = get().config
    const reviewed = get().conflicts
    set({ busy: true, status: 'syncing', error: null })
    try {
      const savedBase = readBase(config)
      const base = savedBase?.data ?? emptyData()
      for (let attempt = 0; attempt < 3; attempt++) {
        const response = await davRequest(config, 'GET')
        const missing = response.status === 404
        if (!missing) checkStatus(response.status)
        const remote = missing ? base : parseDocument(response.body).data
        if (!missing && !strongEtag(response.etag)) throw new Error('sync.noEtag')
        const before = workspaceBridge.loadSync()
        const original = extractData(before, base)
        const pristine =
          !savedBase &&
          !missing &&
          fingerprint(original) === fingerprint(extractData(createSeedWorkspace()))
        const local = pristine ? emptyData() : original
        const preview = mergeData(base, local, remote)
        const choices: Record<string, 'local' | 'remote'> = {}
        if (choice)
          for (const conflict of preview.conflicts) {
            if (
              reviewed.some(
                (old) =>
                  old.key === conflict.key &&
                  old.local === conflict.local &&
                  old.remote === conflict.remote,
              )
            )
              choices[conflict.key] = choice
          }
        const merged = mergeData(base, local, remote, choices)
        if (merged.conflicts.length) {
          set({ status: 'conflict', conflicts: merged.conflicts })
          return
        }
        if (missing || fingerprint(merged.data) !== fingerprint(remote)) {
          const write = await davRequest(
            config,
            'PUT',
            JSON.stringify({ format: 'pantodo-webdav', version: 1, data: merged.data }),
            missing ? null : response.etag,
          )
          if (write.status === 412) continue
          checkStatus(write.status)
        }
        await workspaceBridge.applySync(merged.data, original)
        useAppStore.getState().reloadWorkspace()
        const lastSyncAt = new Date().toISOString()
        const saved: SavedBase = { endpoint: endpoint(config), data: merged.data, lastSyncAt }
        localStorage.setItem(SYNC_BASE_KEY, JSON.stringify(saved))
        set({ status: 'success', lastSyncAt, conflicts: [] })
        return
      }
      throw new Error('sync.concurrent')
    } catch (error) {
      set({ status: 'error', error: syncError(error) })
    } finally {
      set({ busy: false })
    }
  },
}))
function syncError(error: unknown): MessageKey {
  const message = error instanceof Error ? error.message : ''
  const known = [
    'sync.invalidUrl',
    'sync.invalidData',
    'sync.tooLarge',
    'sync.network',
    'sync.browserNetwork',
    'sync.auth',
    'sync.directory',
    'sync.server',
    'sync.noEtag',
    'sync.concurrent',
  ]
  return (known.includes(message) ? message : 'sync.storage') as MessageKey
}
/** Optional polling starts only after the user has explicitly saved automatic sync. */
export function startAutoSync(): () => void {
  let debounce: ReturnType<typeof setTimeout> | undefined
  const run = () => {
    const state = useSyncStore.getState()
    if (
      state.provider === 'webdav' &&
      state.config.autoSync &&
      state.config.url &&
      !state.busy &&
      state.status !== 'conflict' &&
      useAppStore.getState().ready &&
      navigator.onLine !== false
    )
      void state.sync()
  }
  const schedule = () => {
    clearTimeout(debounce)
    debounce = setTimeout(run, 1800)
  }
  const unsubscribeApp = useAppStore.subscribe((state, previous) => {
    if (useSyncStore.getState().busy) return
    if (
      state.ready !== previous.ready ||
      state.tasks !== previous.tasks ||
      state.taskTags !== previous.taskTags ||
      state.projects !== previous.projects ||
      state.tags !== previous.tags ||
      state.views !== previous.views ||
      state.timeEntries !== previous.timeEntries
    )
      if (
        state.ready !== previous.ready ||
        fingerprint(extractData(state)) !== fingerprint(extractData(previous))
      )
        schedule()
  })
  const unsubscribeSync = useSyncStore.subscribe((state, previous) => {
    if (state.config !== previous.config || state.provider !== previous.provider) schedule()
    if (previous.busy && !state.busy && state.status === 'success' && state.config.autoSync) {
      const base = readBase(state.config)?.data
      if (base && fingerprint(extractData(workspaceBridge.loadSync(), base)) !== fingerprint(base))
        schedule()
    }
  })
  const interval = setInterval(run, 60_000)
  window.addEventListener('online', run)
  window.addEventListener('focus', run)
  schedule()
  return () => {
    clearTimeout(debounce)
    clearInterval(interval)
    unsubscribeApp()
    unsubscribeSync()
    window.removeEventListener('online', run)
    window.removeEventListener('focus', run)
  }
}
