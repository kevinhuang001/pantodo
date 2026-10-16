import { create } from 'zustand'

import { createBridge } from '@/bridge'
import type { MessageKey } from '@/i18n'
import { resolveLocale, setLocale } from '@/i18n'

import { nowIso } from './date'
import { newId } from './ids'
import type {
  AppTab,
  GroupArrangement,
  GroupField,
  Id,
  Project,
  ScheduleBlock,
  Settings,
  Tag,
  Task,
  TaskStatus,
  View,
  ViewFilter,
  ViewLayout,
  Workspace,
} from './types'

const bridge = createBridge()

export interface NewTaskInput {
  title: string
  notes?: string
  projectId?: Id | null
  dueAt?: string | null
  estimateMinutes?: number | null
  status?: TaskStatus
  tagIds?: Id[]
  block?: { startAt: string; endAt: string } | null
}

export interface NewViewInput {
  name: string
  icon: string
  filter: ViewFilter
  groupBy: GroupField
  arrangement: GroupArrangement
  gridColumns: number
  layout: ViewLayout
}

interface Toast {
  key: MessageKey
  nonce: number
}

export interface AppState {
  ready: boolean
  error: string | null

  projects: Project[]
  tags: Tag[]
  tasks: Task[]
  taskTags: Record<Id, Id[]>
  scheduleBlocks: ScheduleBlock[]
  views: View[]
  settings: Settings

  activeTab: AppTab
  activeViewId: Id | null
  search: string
  selectedTaskId: Id | null
  /** Transient filtering from the sidebar; M5 turns this into first-class saved views. */
  tagFilterId: Id | null
  projectFilterId: Id | null
  toast: Toast | null

  init: () => Promise<void>
  resetWorkspace: () => Promise<void>

  setActiveTab: (tab: AppTab) => void
  setActiveView: (id: Id) => void
  setSearch: (value: string) => void
  selectTask: (id: Id | null) => void
  setTagFilter: (id: Id | null) => void
  setProjectFilter: (id: Id | null) => void
  notify: (key: MessageKey) => void
  dismissToast: () => void

  createTask: (input: NewTaskInput) => Promise<Id>
  updateTask: (id: Id, patch: Partial<Task>) => Promise<void>
  setTaskStatus: (id: Id, status: TaskStatus) => Promise<void>
  softDeleteTask: (id: Id) => Promise<void>
  restoreTask: (id: Id) => Promise<void>
  archiveTask: (id: Id) => Promise<void>
  emptyTrash: () => Promise<void>
  setTaskTags: (id: Id, tagIds: Id[]) => Promise<void>
  setTaskSchedule: (id: Id, block: { startAt: string; endAt: string } | null) => Promise<void>

  createProject: (name: string, color: string | null) => Promise<void>
  updateProject: (id: Id, patch: Partial<Project>) => Promise<void>
  softDeleteProject: (id: Id) => Promise<void>

  createTag: (name: string, color: string | null) => Promise<void>
  updateTag: (id: Id, patch: Partial<Tag>) => Promise<void>
  softDeleteTag: (id: Id) => Promise<void>

  updateView: (id: Id, patch: Partial<View>) => Promise<void>
  createView: (input: NewViewInput) => Promise<Id>
  softDeleteView: (id: Id) => Promise<void>
  reorderGroups: (viewId: Id, from: number, to: number) => Promise<void>

  updateSettings: (patch: Partial<Settings>) => Promise<void>
}

const emptyWorkspace: Workspace = {
  projects: [],
  tags: [],
  tasks: [],
  taskTags: {},
  scheduleBlocks: [],
  views: [],
  settings: {
    theme: 'system',
    localePreference: 'system',
    weekStartsOn: 1,
    reminderLeadMinutes: 20,
    notificationsSilent: true,
    seedVersion: 0,
  },
}

function workspaceSlice(workspace: Workspace) {
  return {
    projects: workspace.projects,
    tags: workspace.tags,
    tasks: workspace.tasks,
    taskTags: workspace.taskTags,
    scheduleBlocks: workspace.scheduleBlocks,
    views: workspace.views,
    settings: workspace.settings,
  }
}

function withUpdated<T extends { updatedAt: string }>(entity: T, patch: Partial<T>): T {
  return { ...entity, ...patch, updatedAt: nowIso() }
}

function upsert<T extends { id: Id; updatedAt: string }>(items: T[], next: T): T[] {
  const index = items.findIndex((item) => item.id === next.id)
  if (index === -1) return [...items, next]
  const copy = [...items]
  copy[index] = next
  return copy
}

export const useAppStore = create<AppState>()((set, get) => ({
  ready: false,
  error: null,
  ...workspaceSlice(emptyWorkspace),
  activeTab: 'views',
  activeViewId: null,
  search: '',
  selectedTaskId: null,
  tagFilterId: null,
  projectFilterId: null,
  toast: null,

  async init() {
    try {
      const workspace = await bridge.load()
      setLocale(resolveLocale(workspace.settings.localePreference))
      const activeViewId =
        workspace.views.find((view) => view.builtin && view.preset === 'today')?.id ??
        workspace.views[0]?.id ??
        null
      set({ ...workspaceSlice(workspace), ready: true, activeViewId, error: null })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), ready: true })
    }
  },

  async resetWorkspace() {
    const workspace = await bridge.reset()
    set({ ...workspaceSlice(workspace), selectedTaskId: null })
    get().notify('toast.reset')
  },

  setActiveTab(tab) {
    set({ activeTab: tab })
  },

  setActiveView(id) {
    set({
      activeViewId: id,
      activeTab: 'views',
      selectedTaskId: null,
      tagFilterId: null,
      projectFilterId: null,
    })
  },

  setSearch(value) {
    set({ search: value })
  },

  selectTask(id) {
    set({ selectedTaskId: id })
  },

  setTagFilter(id) {
    set({ tagFilterId: id })
  },

  setProjectFilter(id) {
    set({ projectFilterId: id })
  },

  notify(key) {
    set({ toast: { key, nonce: Date.now() } })
  },

  dismissToast() {
    set({ toast: null })
  },

  async createTask(input) {
    const state = get()
    const now = nowIso()
    const task: Task = {
      id: newId(),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      title: input.title.trim(),
      notes: input.notes ?? '',
      status: input.status ?? 'todo',
      projectId: input.projectId ?? null,
      dueAt: input.dueAt ?? null,
      estimateMinutes: input.estimateMinutes ?? null,
      completedAt: input.status === 'done' ? now : null,
      archivedAt: null,
      sortOrder: state.tasks.length,
    }
    const tagIds = input.tagIds ?? []
    const block: ScheduleBlock | null =
      input.block === null || input.block === undefined
        ? null
        : {
            id: newId(),
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
            taskId: task.id,
            startAt: input.block.startAt,
            endAt: input.block.endAt,
          }

    set({
      tasks: [...state.tasks, task],
      taskTags: { ...state.taskTags, [task.id]: tagIds },
      scheduleBlocks: block === null ? state.scheduleBlocks : [...state.scheduleBlocks, block],
    })

    await bridge.upsertTask(task)
    if (tagIds.length > 0) await bridge.setTaskTags(task.id, tagIds)
    if (block !== null) await bridge.upsertScheduleBlock(block)
    get().notify('toast.taskCreated')
    return task.id
  },

  async updateTask(id, patch) {
    const current = get().tasks.find((task) => task.id === id)
    if (current === undefined) return
    const next = withUpdated(current, patch)
    if (patch.status === 'done' && current.status !== 'done') next.completedAt = nowIso()
    if (patch.status !== undefined && patch.status !== 'done') next.completedAt = null
    set({ tasks: upsert(get().tasks, next) })
    await bridge.upsertTask(next)
    get().notify('toast.taskUpdated')
  },

  async setTaskStatus(id, status) {
    await get().updateTask(id, { status })
  },

  async softDeleteTask(id) {
    const current = get().tasks.find((task) => task.id === id)
    if (current === undefined) return
    const next = withUpdated(current, { deletedAt: nowIso() })
    set({ tasks: upsert(get().tasks, next), selectedTaskId: null })
    await bridge.upsertTask(next)
    get().notify('toast.taskDeleted')
  },

  async restoreTask(id) {
    const current = get().tasks.find((task) => task.id === id)
    if (current === undefined) return
    const next = withUpdated(current, { deletedAt: null })
    set({ tasks: upsert(get().tasks, next) })
    await bridge.upsertTask(next)
    get().notify('toast.taskRestored')
  },

  async archiveTask(id) {
    const current = get().tasks.find((task) => task.id === id)
    if (current === undefined) return
    const next = withUpdated(current, { archivedAt: nowIso() })
    set({ tasks: upsert(get().tasks, next) })
    await bridge.upsertTask(next)
    get().notify('toast.archived')
  },

  async emptyTrash() {
    const ids = get()
      .tasks.filter((task) => task.deletedAt !== null)
      .map((task) => task.id)
    if (ids.length === 0) return
    const purge = new Set(ids)
    const taskTags = { ...get().taskTags }
    for (const id of purge) delete taskTags[id]
    set({
      tasks: get().tasks.filter((task) => !purge.has(task.id)),
      scheduleBlocks: get().scheduleBlocks.filter((block) => !purge.has(block.taskId)),
      taskTags,
    })
    await bridge.purgeTasks(ids)
    get().notify('toast.trashEmptied')
  },

  async setTaskTags(id, tagIds) {
    set({ taskTags: { ...get().taskTags, [id]: tagIds } })
    await bridge.setTaskTags(id, tagIds)
  },

  async setTaskSchedule(id, block) {
    const state = get()
    const existing = state.scheduleBlocks.filter(
      (candidate) => candidate.taskId === id && candidate.deletedAt === null,
    )
    for (const stale of existing) {
      await bridge.removeScheduleBlock(stale.id)
    }
    const remaining = state.scheduleBlocks.filter(
      (candidate) => !existing.some((stale) => stale.id === candidate.id),
    )
    if (block === null) {
      set({ scheduleBlocks: remaining })
      return
    }
    const now = nowIso()
    const created: ScheduleBlock = {
      id: newId(),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      taskId: id,
      startAt: block.startAt,
      endAt: block.endAt,
    }
    set({ scheduleBlocks: [...remaining, created] })
    await bridge.upsertScheduleBlock(created)
  },

  async createProject(name, color) {
    const now = nowIso()
    const project: Project = {
      id: newId(),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      name: name.trim(),
      color,
      sortOrder: get().projects.length,
      archivedAt: null,
    }
    set({ projects: [...get().projects, project] })
    await bridge.upsertProject(project)
    get().notify('toast.projectCreated')
  },

  async updateProject(id, patch) {
    const current = get().projects.find((project) => project.id === id)
    if (current === undefined) return
    const next = withUpdated(current, patch)
    set({ projects: upsert(get().projects, next) })
    await bridge.upsertProject(next)
    get().notify('toast.projectUpdated')
  },

  async softDeleteProject(id) {
    const current = get().projects.find((project) => project.id === id)
    if (current === undefined) return
    const next = withUpdated(current, { deletedAt: nowIso() })
    set({ projects: upsert(get().projects, next) })
    await bridge.upsertProject(next)
  },

  async createTag(name, color) {
    const now = nowIso()
    const tag: Tag = {
      id: newId(),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      name: name.trim(),
      color,
      sortOrder: get().tags.length,
    }
    set({ tags: [...get().tags, tag] })
    await bridge.upsertTag(tag)
    get().notify('toast.tagCreated')
  },

  async updateTag(id, patch) {
    const current = get().tags.find((tag) => tag.id === id)
    if (current === undefined) return
    const next = withUpdated(current, patch)
    set({ tags: upsert(get().tags, next) })
    await bridge.upsertTag(next)
    get().notify('toast.tagUpdated')
  },

  async softDeleteTag(id) {
    const current = get().tags.find((tag) => tag.id === id)
    if (current === undefined) return
    const next = withUpdated(current, { deletedAt: nowIso() })
    set({ tags: upsert(get().tags, next) })
    await bridge.upsertTag(next)
  },

  async updateView(id, patch) {
    const current = get().views.find((view) => view.id === id)
    if (current === undefined) return
    const next = withUpdated(current, patch)
    set({ views: upsert(get().views, next) })
    await bridge.upsertView(next)
  },

  async createView(input) {
    const now = nowIso()
    const views = get().views
    const view: View = {
      id: newId(),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      name: input.name.trim(),
      icon: input.icon,
      builtin: false,
      preset: null,
      filter: input.filter,
      groupBy: input.groupBy,
      arrangement: input.arrangement,
      gridColumns: input.gridColumns,
      layout: input.layout,
      sort: 'manual',
      groups: [],
      sortOrder: views.reduce((max, candidate) => Math.max(max, candidate.sortOrder), 0) + 1,
    }
    set({
      views: [...views, view],
      activeViewId: view.id,
      activeTab: 'views',
      selectedTaskId: null,
    })
    await bridge.upsertView(view)
    get().notify('toast.viewCreated')
    return view.id
  },

  async softDeleteView(id) {
    const current = get().views.find((view) => view.id === id)
    if (current === undefined || current.builtin) return
    const next = withUpdated(current, { deletedAt: nowIso() })
    const views = upsert(get().views, next)
    const remaining = views.filter((view) => view.deletedAt === null && view.preset !== 'trash')
    const activeViewId = get().activeViewId === id ? (remaining[0]?.id ?? null) : get().activeViewId
    set({ views, activeViewId })
    await bridge.upsertView(next)
  },

  async reorderGroups(viewId, from, to) {
    const view = get().views.find((candidate) => candidate.id === viewId)
    if (view === undefined) return
    const groups = [...view.groups].sort((a, b) => a.sortOrder - b.sortOrder)
    if (from < 0 || from >= groups.length || to < 0 || to >= groups.length || from === to) return
    const [moved] = groups.splice(from, 1)
    if (moved === undefined) return
    groups.splice(to, 0, moved)
    const next = withUpdated(view, {
      groups: groups.map((group, index) => ({ ...group, sortOrder: index })),
    })
    set({ views: upsert(get().views, next) })
    await bridge.upsertView(next)
  },

  async updateSettings(patch) {
    const next: Settings = { ...get().settings, ...patch }
    set({ settings: next })
    if (patch.localePreference !== undefined) setLocale(resolveLocale(next.localePreference))
    await bridge.saveSettings(next)
  },
}))
