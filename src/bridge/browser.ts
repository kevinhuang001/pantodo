import { createSeedWorkspace, defaultSettings } from '@/domain/presets'
import type {
  Id,
  Project,
  ScheduleBlock,
  Settings,
  Tag,
  Task,
  View,
  Workspace,
} from '@/domain/types'

import type { Bridge } from './types'

export const STORAGE_KEY = 'pantodo.workspace.v2'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function readStorage(): Workspace | null {
  if (typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === null) return null
  try {
    return JSON.parse(raw) as Workspace
  } catch {
    return null
  }
}

function writeStorage(workspace: Workspace): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
}

function wantsReset(): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  return params.get('reset') === '1'
}

/**
 * Browser fixture: the whole workspace in `localStorage`.
 *
 * It seeds sample tasks so the UI (and the headless screenshots) are not empty. The Rust core in M2
 * will seed views and tags only — demo content is a fixture concern, not a product behaviour.
 */
export function createBrowserBridge(): Bridge {
  let cache: Workspace | null = null

  const ensure = (): Workspace => {
    if (cache !== null) return cache
    const stored = wantsReset() ? null : readStorage()
    if (stored !== null) {
      // Tolerate a workspace written by an older build: new settings pick up their defaults.
      cache = { ...stored, settings: { ...defaultSettings(), ...stored.settings } }
      return cache
    }
    cache = createSeedWorkspace({ withDemoData: true })
    writeStorage(cache)
    return cache
  }

  const commit = (mutate: (workspace: Workspace) => void): void => {
    const workspace = ensure()
    mutate(workspace)
    writeStorage(workspace)
  }

  return {
    kind: 'browser',

    async load() {
      return clone(ensure())
    },

    async reset() {
      cache = createSeedWorkspace({ withDemoData: true })
      writeStorage(cache)
      return clone(cache)
    },

    async upsertProject(project: Project) {
      commit((workspace) => {
        replaceById(workspace.projects, project)
      })
    },

    async upsertTag(tag: Tag) {
      commit((workspace) => {
        replaceById(workspace.tags, tag)
      })
    },

    async upsertTask(task: Task) {
      commit((workspace) => {
        replaceById(workspace.tasks, task)
        if (workspace.taskTags[task.id] === undefined) {
          workspace.taskTags[task.id] = []
        }
      })
    },

    async upsertView(view: View) {
      commit((workspace) => {
        replaceById(workspace.views, view)
      })
    },

    async setTaskTags(taskId: Id, tagIds: Id[]) {
      commit((workspace) => {
        workspace.taskTags[taskId] = [...tagIds]
      })
    },

    async upsertScheduleBlock(block: ScheduleBlock) {
      commit((workspace) => {
        replaceById(workspace.scheduleBlocks, block)
      })
    },

    async removeScheduleBlock(id: Id) {
      commit((workspace) => {
        workspace.scheduleBlocks = workspace.scheduleBlocks.filter((block) => block.id !== id)
      })
    },

    async saveSettings(settings: Settings) {
      commit((workspace) => {
        workspace.settings = { ...settings }
      })
    },

    async purgeTasks(ids: Id[]) {
      const purge = new Set(ids)
      commit((workspace) => {
        workspace.tasks = workspace.tasks.filter((task) => !purge.has(task.id))
        workspace.scheduleBlocks = workspace.scheduleBlocks.filter(
          (block) => !purge.has(block.taskId),
        )
        for (const id of purge) delete workspace.taskTags[id]
      })
    },
  }
}

function replaceById<T extends { id: Id }>(items: T[], next: T): void {
  const index = items.findIndex((item) => item.id === next.id)
  if (index === -1) items.push(next)
  else items[index] = next
}
