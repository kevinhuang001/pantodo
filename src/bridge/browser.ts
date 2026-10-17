import { createSeedWorkspace, defaultSettings, SEED_VERSION } from '@/domain/presets'
import { newId } from '@/domain/ids'
import { applyTimeCommand, HEARTBEAT_GAP_MS } from '@/domain/time'
import { workbenchPanels } from '@/domain/views'
import { t, setLocale, resolveLocale } from '@/i18n'
import type { TimeCommand } from '@/domain/time'
import type { Id, Project, Settings, Tag, Task, View, Workspace } from '@/domain/types'
import type { Bridge } from './types'

export const STORAGE_KEY = 'pantodo.workspace.v2'
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
function readStorage(): Workspace | null {
  if (typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? (JSON.parse(raw) as Workspace) : null
}
function writeStorage(workspace: Workspace): void {
  if (typeof localStorage !== 'undefined')
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
}
function normalize(stored: Workspace): Workspace {
  // One-time import of the previous fixture's schedule fields; the live model has no schedule entity.
  const old = stored as Workspace & {
    scheduleBlocks?: { taskId: string; startAt: string; endAt: string; deletedAt: string | null }[]
  }
  const tasks = stored.tasks.map((task) => {
    const block = old.scheduleBlocks?.find((item) => item.taskId === task.id && !item.deletedAt)
    return {
      ...task,
      startAt: task.startAt ?? block?.startAt ?? null,
      endAt: task.endAt ?? block?.endAt ?? null,
    }
  })
  const views = [...stored.views]
  if ((stored.settings.seedVersion ?? 0) < SEED_VERSION && !views.some((view) => view.panels)) {
    const stamp = new Date().toISOString()
    views.push({
      id: newId(),
      createdAt: stamp,
      updatedAt: stamp,
      deletedAt: null,
      name: t('panels.title'),
      emoji: '🪴',
      icon: 'layers',
      builtin: false,
      preset: null,
      filter: {
        tagIds: [],
        tagMode: 'any',
        projectIds: [],
        statuses: [],
        hasTime: 'any',
        text: '',
      },
      groupBy: 'none',
      arrangement: 'grid',
      gridColumns: 2,
      sort: 'manual',
      groups: [],
      panels: workbenchPanels(),
      sortOrder: 3,
    })
  }
  return {
    projects: stored.projects,
    tags: stored.tags,
    tasks,
    taskTags: stored.taskTags,
    views,
    settings: { ...defaultSettings(), ...stored.settings, seedVersion: SEED_VERSION },
    timeEntries: stored.timeEntries ?? [],
    timer: stored.timer ?? null,
  }
}
export function createBrowserBridge(recoverGaps = true): Bridge {
  const ownerId = newId()
  let cache: Workspace | null = null
  let initialized = false
  const ensure = (): Workspace => {
    const reset =
      !initialized &&
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('reset') === '1'
    const stored = reset ? null : readStorage()
    if (!initialized) setLocale(resolveLocale(stored?.settings.localePreference ?? 'system'))
    if (!initialized || stored)
      cache = stored
        ? normalize(stored)
        : (cache ??
          createSeedWorkspace({
            withDemoData:
              typeof window !== 'undefined' &&
              (new URLSearchParams(window.location.search).get('demo') === '1' ||
                new URLSearchParams(window.location.search).get('reset') === '1'),
          }))
    initialized = true
    return cache!
  }
  const commit = (mutate: (workspace: Workspace) => void): void => {
    const workspace = clone(ensure())
    mutate(workspace)
    writeStorage(workspace)
    cache = workspace
  }
  const timeCommand = (command: TimeCommand) => {
    let result
    commit((workspace) => {
      result = applyTimeCommand(workspace, command, new Date(), ownerId, recoverGaps)
      Object.assign(workspace, result)
    })
    return result!
  }
  const loadSync = () => clone(ensure())
  return {
    kind: 'browser',
    ownerId,
    loadSync,
    timeCommand,
    async load() {
      const workspace = ensure()
      // An orphaned timer after a crash stops at its last durable heartbeat.
      if (
        recoverGaps &&
        workspace.timer?.startedAt &&
        Date.now() - Date.parse(workspace.timer.lastHeartbeatAt) > HEARTBEAT_GAP_MS
      )
        Object.assign(
          workspace,
          applyTimeCommand(workspace, { kind: 'heartbeat' }, new Date(), ownerId),
        )
      writeStorage(workspace)
      return clone(workspace)
    },
    async reset() {
      cache = createSeedWorkspace({ withDemoData: true })
      initialized = true
      writeStorage(cache)
      return clone(cache)
    },
    async upsertProject(project: Project) {
      commit((w) => replaceById(w.projects, project))
    },
    async upsertTag(tag: Tag) {
      commit((w) => replaceById(w.tags, tag))
    },
    async upsertTask(task: Task) {
      commit((w) => {
        replaceById(w.tasks, task)
        w.taskTags[task.id] ??= []
      })
    },
    async upsertView(view: View) {
      commit((w) => replaceById(w.views, view))
    },
    async setTaskTags(taskId: Id, tagIds: Id[]) {
      commit((w) => {
        w.taskTags[taskId] = [...tagIds]
      })
    },
    async saveSettings(settings: Settings) {
      commit((w) => {
        w.settings = { ...settings }
      })
    },
    async purgeTasks(ids: Id[]) {
      const purge = new Set(ids)
      commit((w) => {
        w.tasks = w.tasks.filter((task) => !purge.has(task.id))
        for (const id of purge) delete w.taskTags[id]
      })
    },
  }
}
function replaceById<T extends { id: Id }>(items: T[], next: T): void {
  const index = items.findIndex((item) => item.id === next.id)
  if (index < 0) items.push(next)
  else items[index] = next
}
