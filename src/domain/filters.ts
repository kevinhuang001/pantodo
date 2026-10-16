import type { MessageKey } from '@/i18n'

import { colorIndexForName, isSameLocalDay, isOverdue, parseIso } from './date'
import type { GroupRule, Id, Project, Tag, Task, TaskStatus, View, ViewFilter } from './types'

export const COLOR_BUCKETS = 8

export interface FilterContext {
  taskTags: Record<Id, Id[]>
  now: Date
}

export interface TaskGroup {
  key: string
  /** Present for data-derived buckets (project/tag/status names are data, not translations). */
  label: string | null
  /** Present for built-in buckets such as "no tag". */
  labelKey: MessageKey | null
  color: string | null
  tasks: Task[]
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
export function hasSchedule(task: Task): boolean {
  return task.startAt !== null && task.endAt !== null
}

function matchesText(task: Task, text: string): boolean {
  if (text.trim() === '') return true
  const needle = text.trim().toLowerCase()
  return task.title.toLowerCase().includes(needle) || task.notes.toLowerCase().includes(needle)
}

function matchesTags(task: Task, filter: ViewFilter, context: FilterContext): boolean {
  if (filter.tagIds.length === 0) return true
  const taskTagIds = tagsOf(task, context)
  if (filter.tagMode === 'all') {
    return filter.tagIds.every((tagId) => taskTagIds.includes(tagId))
  }
  return filter.tagIds.some((tagId) => taskTagIds.includes(tagId))
}

export function matchesFilter(task: Task, filter: ViewFilter, context: FilterContext): boolean {
  if (task.deletedAt !== null) return false
  if (!matchesText(task, filter.text)) return false
  if (!matchesTags(task, filter, context)) return false
  if ((filter.excludeTagIds ?? []).some((id) => tagsOf(task, context).includes(id))) return false
  if (filter.projectMode === 'none' && task.projectId !== null) return false
  if (filter.dueFrom && (task.dueAt === null || new Date(task.dueAt) < new Date(filter.dueFrom)))
    return false
  if (filter.dueTo && (task.dueAt === null || new Date(task.dueAt) >= new Date(filter.dueTo)))
    return false
  if (filter.projectIds.length > 0) {
    if (task.projectId === null || !filter.projectIds.includes(task.projectId)) return false
  }
  if (filter.statuses.length > 0 && !filter.statuses.includes(task.status)) return false
  if (filter.hasTime === 'scheduled' && !hasSchedule(task)) return false
  if (filter.hasTime === 'unscheduled' && hasSchedule(task)) return false
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
      const dueToday = task.dueAt !== null && isSameLocalDay(task.dueAt, context.now)
      return dueToday || isScheduledOn(task, context.now)
    }
    case 'all':
      return task.deletedAt === null && task.archivedAt === null
    default:
      return task.deletedAt === null && task.archivedAt === null
  }
}

/**
 * Tasks surfaced by a view: preset rules first, then the user filter. Deleted tasks are excluded
 * everywhere except the trash view, which shows nothing else — so the trash view deliberately skips
 * the general filter's "deleted tasks never match" rule.
 */
export function selectTasks(tasks: readonly Task[], view: View, context: FilterContext): Task[] {
  const isTrash = view.preset === 'trash'
  return tasks.filter(
    (task) =>
      matchesPreset(task, view, context) && (isTrash || matchesFilter(task, view.filter, context)),
  )
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

function ruleMatches(rule: GroupRule, task: Task, context: FilterContext): boolean {
  const taskTagIds = tagsOf(task, context)
  if (rule.excludeTagIds.some((tagId) => taskTagIds.includes(tagId))) return false
  if (rule.tagIds.length === 0) return true
  if (rule.tagMode === 'all') return rule.tagIds.every((tagId) => taskTagIds.includes(tagId))
  return rule.tagIds.some((tagId) => taskTagIds.includes(tagId))
}

export function colorFor(
  entity: { name: string; color: string | null },
  palette: readonly string[],
): string {
  if (entity.color !== null && entity.color !== '') return entity.color
  return palette[colorIndexForName(entity.name, palette.length)] ?? palette[0] ?? '#2d6d95'
}

/**
 * Grouping is data-driven: explicit `view.groups` win (that is how the Eisenhower matrix pins its
 * four cells), otherwise buckets are derived from the group field.
 */
export function groupTasks(
  tasks: readonly Task[],
  view: View,
  context: FilterContext,
  tags: readonly Tag[],
  projects: readonly Project[],
  palette: readonly string[],
): TaskGroup[] {
  if (view.groupBy === 'none' && view.groups.length === 0) {
    return [{ key: 'all', label: null, labelKey: null, color: null, tasks: [...tasks] }]
  }

  if (view.groups.length > 0) {
    const groups: TaskGroup[] = view.groups
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((group) => ({
        key: group.id,
        label: group.label,
        labelKey: null,
        color: group.color,
        tasks: tasks.filter((task) => ruleMatches(group.rule, task, context)),
      }))
    const claimed = new Set(groups.flatMap((group) => group.tasks.map((task) => task.id)))
    const rest = tasks.filter((task) => !claimed.has(task.id))
    if (rest.length > 0) {
      groups.push({
        key: 'other',
        label: null,
        labelKey: 'group.uncategorized',
        color: null,
        tasks: rest,
      })
    }
    return groups
  }

  switch (view.groupBy) {
    case 'project': {
      const groups = projects.map<TaskGroup>((project) => ({
        key: `project:${project.id}`,
        label: project.name,
        labelKey: null,
        color: colorFor(project, palette),
        tasks: tasks.filter((task) => task.projectId === project.id),
      }))
      const none = tasks.filter((task) => task.projectId === null)
      if (none.length > 0) {
        groups.push({
          key: 'project:none',
          label: null,
          labelKey: 'group.noProject',
          color: null,
          tasks: none,
        })
      }
      return groups
    }
    case 'status': {
      const buckets: { status: TaskStatus; key: string; labelKey: MessageKey }[] = [
        { status: 'doing', key: 'status:doing', labelKey: 'task.status.doing' },
        { status: 'todo', key: 'status:todo', labelKey: 'task.status.todo' },
        { status: 'done', key: 'status:done', labelKey: 'task.status.done' },
      ]
      return buckets.map((bucket) => ({
        key: bucket.key,
        label: null,
        labelKey: bucket.labelKey,
        color: null,
        tasks: tasks.filter((task) => task.status === bucket.status),
      }))
    }
    case 'tag':
    default: {
      const groups = tags.map<TaskGroup>((tag) => ({
        key: `tag:${tag.id}`,
        label: tag.name,
        labelKey: null,
        color: colorFor(tag, palette),
        tasks: tasks.filter((task) => tagsOf(task, context).includes(tag.id)),
      }))
      const claimed = new Set(groups.flatMap((group) => group.tasks.map((task) => task.id)))
      const untagged = tasks.filter((task) => !claimed.has(task.id))
      if (untagged.length > 0) {
        groups.push({
          key: 'tag:none',
          label: null,
          labelKey: 'group.noTag',
          color: null,
          tasks: untagged,
        })
      }
      return groups
    }
  }
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
