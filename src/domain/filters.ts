import { dateKey } from './recurrence'
import { colorIndexForName, isSameLocalDay, isOverdue, parseIso } from './date'
import type { Id, Task, TaskStatus, View, PanelFilter } from './types'

export const COLOR_BUCKETS = 8

export interface FilterContext {
  taskTags: Record<Id, Id[]>
  now: Date
}

export function tagsOf(task: Task, context: FilterContext): Id[] {
  return context.taskTags[task.id] ?? []
}

export function isScheduledOn(task: Task, day: Date): boolean {
  if (!task.startAt || !task.endAt) return false
  const from = new Date(day)
  from.setHours(0, 0, 0, 0)
  const to = new Date(from)
  to.setDate(to.getDate() + 1)
  return new Date(task.startAt) < to && new Date(task.endAt) > from
}

function matchesText(task: Task, text: string): boolean {
  if (text.trim() === '') return true
  const needle = text.trim().toLowerCase()
  return task.title.toLowerCase().includes(needle) || task.notes.toLowerCase().includes(needle)
}

function matchesTags(task: Task, filter: PanelFilter, context: FilterContext): boolean {
  if (filter.tagIds.length === 0) return true
  const taskTagIds = tagsOf(task, context)
  if (filter.tagMode === 'all') {
    return filter.tagIds.every((tagId) => taskTagIds.includes(tagId))
  }
  return filter.tagIds.some((tagId) => taskTagIds.includes(tagId))
}

export function matchesFilter(task: Task, filter: PanelFilter, context: FilterContext): boolean {
  if (task.deletedAt !== null) return false
  if (!matchesText(task, filter.text)) return false
  if (!matchesTags(task, filter, context)) return false
  if (filter.projectMode === 'none' && task.projectId !== null) return false
  if (filter.projectIds.length > 0) {
    if (task.projectId === null || !filter.projectIds.includes(task.projectId)) return false
  }
  if (filter.statuses.length > 0 && !filter.statuses.includes(task.status)) return false
  return true
}

/** Built-in views cannot be expressed as a static filter, so they carry a preset. */
export function matchesPreset(task: Task, view: View, context: FilterContext): boolean {
  switch (view.preset) {
    case 'trash':
      return task.deletedAt !== null
    case 'inbox':
      return task.deletedAt === null && task.archivedAt === null && task.projectId === null
    case 'today': {
      if (task.deletedAt !== null || task.archivedAt !== null) return false
      if (task.occurrenceKey === dateKey(context.now)) return true
      const dueToday = task.dueAt !== null && isSameLocalDay(task.dueAt, context.now)
      return dueToday || isScheduledOn(task, context.now)
    }
    case 'all':
      return task.deletedAt === null && task.archivedAt === null
    default:
      return task.deletedAt === null && task.archivedAt === null
  }
}

/** Views select their lifecycle scope; each panel owns its independent filter. */
export function selectTasks(tasks: readonly Task[], view: View, context: FilterContext): Task[] {
  return tasks.filter((task) => matchesPreset(task, view, context))
}

export function sortTasks(tasks: readonly Task[], view: View, context: FilterContext): Task[] {
  const copy = [...tasks]
  const statusRank: Record<TaskStatus, number> = { doing: 0, todo: 1, done: 2, cancelled: 3 }
  switch (view.sort) {
    case 'due':
      copy.sort((a, b) => {
        const left = a.dueAt === null ? Number.POSITIVE_INFINITY : parseIso(a.dueAt).getTime()
        const right = b.dueAt === null ? Number.POSITIVE_INFINITY : parseIso(b.dueAt).getTime()
        return left - right || a.sortOrder - b.sortOrder
      })
      break
    case 'created':
      copy.sort((a, b) => parseIso(b.createdAt).getTime() - parseIso(a.createdAt).getTime())
      break
    case 'title':
      copy.sort((a, b) => a.title.localeCompare(b.title))
      break
    case 'manual':
    default:
      copy.sort(
        (a, b) =>
          statusRank[a.status] - statusRank[b.status] ||
          a.sortOrder - b.sortOrder ||
          parseIso(a.createdAt).getTime() - parseIso(b.createdAt).getTime(),
      )
      break
  }
  void context
  return copy
}

export function colorFor(
  entity: { name: string; color: string | null },
  palette: readonly string[],
): string {
  if (entity.color !== null && entity.color !== '') return entity.color
  return palette[colorIndexForName(entity.name, palette.length)] ?? palette[0] ?? '#2d6d95'
}

export function countByStatus(tasks: readonly Task[]): Record<TaskStatus, number> {
  const counts: Record<TaskStatus, number> = { todo: 0, doing: 0, done: 0, cancelled: 0 }
  for (const task of tasks) counts[task.status] += 1
  return counts
}

export function dueState(task: Task, now: Date): 'overdue' | 'today' | null {
  if (task.dueAt === null || task.status === 'done' || task.status === 'cancelled') return null
  if (isSameLocalDay(task.dueAt, now)) return 'today'
  return isOverdue(task.dueAt, now) ? 'overdue' : null
}
