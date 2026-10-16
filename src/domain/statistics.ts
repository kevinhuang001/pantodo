import { clippedSeconds, dailySeconds } from './time'
import type { Task, TimeEntry, Workspace } from './types'

export interface StatisticsFilter {
  start: Date
  end: Date
  projectId: string
  tagIds: string[]
}
export function selectTimeEntries(
  workspace: Workspace,
  filter: StatisticsFilter,
  now: Date,
): TimeEntry[] {
  const tasks = new Map(workspace.tasks.map((task) => [task.id, task]))
  const entries = [...workspace.timeEntries]
  const timer = workspace.timer
  if (timer?.startedAt)
    entries.push({
      id: 'live',
      taskId: timer.taskId,
      startedAt: timer.startedAt,
      endedAt: now.toISOString(),
      source: 'timer',
      note: '',
      createdAt: timer.startedAt,
      updatedAt: now.toISOString(),
      deletedAt: null,
    })
  return entries
    .filter((entry) => {
      if (entry.deletedAt || clippedSeconds(entry, filter.start, filter.end) <= 0) return false
      const task = entry.taskId ? tasks.get(entry.taskId) : undefined
      if (filter.projectId && task?.projectId !== filter.projectId) return false
      if (
        filter.tagIds.length &&
        !filter.tagIds.some(
          (id) => entry.taskId && (workspace.taskTags[entry.taskId] ?? []).includes(id),
        )
      )
        return false
      return true
    })
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
}
export function buildStatistics(workspace: Workspace, filter: StatisticsFilter, now: Date) {
  const entries = selectTimeEntries(workspace, filter, now)
  const tasks = new Map(workspace.tasks.map((task) => [task.id, task]))
  const total = entries.reduce(
    (sum, entry) => sum + clippedSeconds(entry, filter.start, filter.end),
    0,
  )
  const byProject = new Map<string, number>(),
    byTag = new Map<string, number>(),
    byTask = new Map<string, number>()
  for (const entry of entries) {
    const seconds = clippedSeconds(entry, filter.start, filter.end)
    const task = entry.taskId ? tasks.get(entry.taskId) : undefined
    const project = task?.projectId ?? ''
    byProject.set(project, (byProject.get(project) ?? 0) + seconds)
    const tagIds = [...new Set(entry.taskId ? (workspace.taskTags[entry.taskId] ?? []) : [])]
    for (const tag of tagIds.length ? tagIds : ['']) byTag.set(tag, (byTag.get(tag) ?? 0) + seconds)
    const taskId = entry.taskId ?? ''
    byTask.set(taskId, (byTask.get(taskId) ?? 0) + seconds)
  }
  const completed = workspace.tasks.filter(
    (task) =>
      !task.deletedAt &&
      task.status === 'done' &&
      task.completedAt &&
      new Date(task.completedAt) >= filter.start &&
      new Date(task.completedAt) < filter.end &&
      (!filter.projectId || task.projectId === filter.projectId) &&
      (!filter.tagIds.length ||
        filter.tagIds.some((id) => (workspace.taskTags[task.id] ?? []).includes(id))),
  ).length
  return {
    entries,
    total,
    byProject,
    byTag,
    byTask,
    completed,
    daily: dailySeconds(entries, filter.start, filter.end),
  }
}
export function taskLabel(task: Task | undefined, fallback: string): string {
  return task?.title ?? fallback
}
export function csvCell(value: string | number): string {
  const text = String(value)
  return '"' + (/^[=+\-@\t\r]/.test(text) ? "'" + text : text).replaceAll('"', '""') + '"'
}
