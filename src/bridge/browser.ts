import { applyData, extractData, mergeData } from '@/sync/model'
import { createSeedWorkspace } from '@/domain/presets'
import { newId } from '@/domain/ids'
import { applyTimeCommand, HEARTBEAT_GAP_MS } from '@/domain/time'
import { setLocale, resolveLocale } from '@/i18n'
import type { TimeCommand } from '@/domain/time'
import {
  isOpenTask,
  type Id,
  type Project,
  type Settings,
  type Tag,
  type Task,
  type View,
  type Workspace,
} from '@/domain/types'
import type { Bridge } from './types'

export const STORAGE_KEY = 'pantodo.workspace.v2'
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
function readStorage(): Workspace | null {
  if (typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  const workspace = JSON.parse(raw) as Workspace
  return workspace
}
function writeStorage(workspace: Workspace): void {
  if (typeof localStorage !== 'undefined')
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
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
        ? stored
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
    async applySync(data, previous) {
      commit((workspace) => {
        const current = extractData(workspace, previous)
        const preview = mergeData(previous, current, data)
        const choices = Object.fromEntries(
          preview.conflicts.map((conflict) => [conflict.key, 'local' as const]),
        )
        const merged = mergeData(previous, current, data, choices).data
        const running = workspace.timer?.taskId
        const active = running ? merged.tasks[running]?.task : undefined
        const occurrence = workspace.timer?.occurrenceKey
          ? active?.occurrences?.[workspace.timer.occurrenceKey]
          : undefined
        if (
          running &&
          (!active ||
            !isOpenTask(active) ||
            occurrence?.deletedAt ||
            occurrence?.status === 'done' ||
            occurrence?.status === 'cancelled')
        ) {
          Object.assign(
            workspace,
            applyTimeCommand(workspace, { kind: 'stop' }, new Date(), ownerId, recoverGaps),
          )
          // Stopping a closed running Todo must retain its last committed segment.
          for (const entry of workspace.timeEntries) merged.timeEntries[entry.id] ??= entry
        }
        Object.assign(workspace, applyData(workspace, merged))
      })
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
