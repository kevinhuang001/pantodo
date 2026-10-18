import { validRecurrence } from '@/domain/recurrence'
import type { Project, Tag, Task, TimeEntry, View, Workspace } from '@/domain/types'

export interface SyncedTask {
  task: Task
  tagIds: string[]
}
export interface SyncData {
  projects: Record<string, Project | null>
  tags: Record<string, Tag | null>
  tasks: Record<string, SyncedTask | null>
  views: Record<string, View | null>
  timeEntries: Record<string, TimeEntry | null>
}
export interface SyncDocument {
  format: 'pantodo-webdav'
  version: 1
  data: SyncData
}
export interface SyncConflict {
  key: string
  title: string
  local: string
  remote: string
}
export const COLLECTIONS = ['projects', 'tags', 'tasks', 'views', 'timeEntries'] as const
export const emptyData = (): SyncData => ({
  projects: {},
  tags: {},
  tasks: {},
  views: {},
  timeEntries: {},
})

/** Stable comparisons ignore JSON property order and preserve actual array ordering. */
export function fingerprint(value: unknown): string {
  if (value === undefined) return 'undefined'
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return '[' + value.map(fingerprint).join(',') + ']'
  return (
    '{' +
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => JSON.stringify(key) + ':' + fingerprint(v))
      .join(',') +
    '}'
  )
}
export function extractData(workspace: Workspace, base = emptyData()): SyncData {
  const data = emptyData()
  for (const collection of COLLECTIONS) {
    const records: Record<string, unknown> = data[collection]
    for (const entity of workspace[collection]) {
      if (collection === 'views' && (entity as View).builtin) continue
      records[entity.id] =
        collection === 'tasks'
          ? { task: entity, tagIds: [...(workspace.taskTags[entity.id] ?? [])].sort() }
          : entity
    }
    // Permanent deletions remain in the sync file so an offline device cannot resurrect them.
    for (const id of Object.keys(base[collection])) if (!(id in records)) records[id] = null
  }
  return data
}
export function mergeData(
  base: SyncData,
  local: SyncData,
  remote: SyncData,
  choices: Record<string, 'local' | 'remote'> = {},
): { data: SyncData; conflicts: SyncConflict[] } {
  const data = emptyData(),
    conflicts: SyncConflict[] = []
  for (const collection of COLLECTIONS) {
    const target: Record<string, unknown> = data[collection]
    const ids = new Set([
      ...Object.keys(base[collection]),
      ...Object.keys(local[collection]),
      ...Object.keys(remote[collection]),
    ])
    for (const id of ids) {
      const b = base[collection][id],
        l = local[collection][id],
        r = remote[collection][id]
      const localHash = fingerprint(l),
        remoteHash = fingerprint(r),
        baseHash = fingerprint(b)
      const key = collection + ':' + id
      let result: unknown
      if (localHash === remoteHash || remoteHash === baseHash) result = l
      else if (localHash === baseHash) result = r
      else if (choices[key]) result = choices[key] === 'local' ? l : r
      else {
        const entity = l ?? r ?? b
        const title =
          entity &&
          ('task' in entity
            ? entity.task.title
            : 'name' in entity
              ? entity.name
              : entity.note || entity.startedAt)
        conflicts.push({ key, title: title || id, local: localHash, remote: remoteHash })
        result = l
      }
      target[id] = result === undefined ? null : result
    }
  }
  const entries = Object.values(data.timeEntries)
    .filter((entry): entry is TimeEntry => !!entry && !entry.deletedAt)
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt))
  for (let i = 0; i < entries.length; i++)
    for (let j = i + 1; j < entries.length; j++) {
      const a = data.timeEntries[entries[i].id],
        b = data.timeEntries[entries[j].id]
      if (
        !a ||
        !b ||
        a.deletedAt ||
        b.deletedAt ||
        Date.parse(a.endedAt) <= Date.parse(b.startedAt) ||
        Date.parse(b.endedAt) <= Date.parse(a.startedAt)
      )
        continue
      const aLocal = fingerprint(local.timeEntries[a.id]) !== fingerprint(base.timeEntries[a.id])
      const bLocal = fingerprint(local.timeEntries[b.id]) !== fingerprint(base.timeEntries[b.id])
      const localEntry = aLocal && !bLocal ? a : bLocal && !aLocal ? b : a
      const remoteEntry = localEntry === a ? b : a
      const key = 'overlap:' + [a.id, b.id].sort().join(':')
      if (choices[key]) {
        const loser = choices[key] === 'local' ? remoteEntry : localEntry
        const stamp = new Date(
          Math.max(Date.parse(a.updatedAt), Date.parse(b.updatedAt)) + 1,
        ).toISOString()
        data.timeEntries[loser.id] = { ...loser, deletedAt: stamp, updatedAt: stamp }
      } else
        conflicts.push({
          key,
          title:
            (localEntry.note || localEntry.startedAt) +
            ' / ' +
            (remoteEntry.note || remoteEntry.startedAt),
          local: fingerprint(localEntry),
          remote: fingerprint(remoteEntry),
        })
    }
  return { data, conflicts }
}
export function applyData(workspace: Workspace, data: SyncData): Workspace {
  const tasks = Object.values(data.tasks).filter((value): value is SyncedTask => value !== null)
  return {
    ...workspace,
    projects: Object.values(data.projects).filter((value): value is Project => value !== null),
    tags: Object.values(data.tags).filter((value): value is Tag => value !== null),
    tasks: tasks.map(({ task }) => task),
    taskTags: Object.fromEntries(tasks.map(({ task, tagIds }) => [task.id, tagIds])),
    views: [
      ...workspace.views.filter((view) => view.builtin),
      ...Object.values(data.views).filter((value): value is View => value !== null),
    ],
    timeEntries: Object.values(data.timeEntries).filter(
      (value): value is TimeEntry => value !== null,
    ),
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
function string(value: unknown): value is string {
  return typeof value === 'string'
}
function number(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
function nullableString(value: unknown) {
  return value === null || string(value)
}
function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(string)
}
function instant(value: unknown) {
  return string(value) && Number.isFinite(Date.parse(value))
}
function nullableInstant(value: unknown) {
  return value === null || instant(value)
}
function entity(value: unknown, id: string): value is Record<string, unknown> {
  return (
    record(value) &&
    value.id === id &&
    instant(value.createdAt) &&
    instant(value.updatedAt) &&
    nullableInstant(value.deletedAt)
  )
}
function filter(value: unknown) {
  return (
    record(value) &&
    strings(value.tagIds) &&
    ['any', 'all'].includes(String(value.tagMode)) &&
    strings(value.projectIds) &&
    Array.isArray(value.statuses) &&
    value.statuses.every((status) =>
      ['todo', 'doing', 'done', 'cancelled'].includes(String(status)),
    ) &&
    string(value.text) &&
    (value.projectMode === undefined || ['any', 'none'].includes(String(value.projectMode)))
  )
}
function valid(collection: (typeof COLLECTIONS)[number], value: unknown, id: string): boolean {
  if (value === null) return true
  if (collection === 'tasks') {
    if (!record(value) || !strings(value.tagIds) || !entity(value.task, id)) return false
    const v = value.task
    return (
      (v.recurrence == null || validRecurrence(v.recurrence)) &&
      (v.skippedOccurrences === undefined ||
        (strings(v.skippedOccurrences) &&
          v.skippedOccurrences.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))) &&
      (v.occurrenceStates === undefined ||
        (record(v.occurrenceStates) &&
          Object.entries(v.occurrenceStates).every(
            ([key, state]) =>
              /^\d{4}-\d{2}-\d{2}$/.test(key) &&
              record(state) &&
              ['todo', 'doing', 'done', 'cancelled'].includes(String(state.status)) &&
              nullableInstant(state.completedAt),
          ))) &&
      string(v.title) &&
      string(v.notes) &&
      ['todo', 'doing', 'done', 'cancelled'].includes(String(v.status)) &&
      nullableString(v.projectId) &&
      ((v.startAt === null && v.endAt === null) ||
        (instant(v.startAt) &&
          instant(v.endAt) &&
          Date.parse(String(v.endAt)) > Date.parse(String(v.startAt)))) &&
      ['startAt', 'endAt', 'dueAt', 'completedAt', 'archivedAt'].every((key) =>
        nullableInstant(v[key]),
      ) &&
      (v.estimateMinutes === null || number(v.estimateMinutes)) &&
      number(v.sortOrder)
    )
  }
  if (!entity(value, id)) return false
  if (collection === 'projects')
    return (
      string(value.name) &&
      number(value.sortOrder) &&
      nullableInstant(value.archivedAt) &&
      (value.emoji === undefined || string(value.emoji))
    )
  if (collection === 'tags')
    return string(value.name) && nullableString(value.color) && number(value.sortOrder)
  if (collection === 'timeEntries')
    return (
      nullableString(value.taskId) &&
      instant(value.startedAt) &&
      instant(value.endedAt) &&
      Date.parse(String(value.endedAt)) > Date.parse(String(value.startedAt)) &&
      ['timer', 'manual'].includes(String(value.source)) &&
      string(value.note)
    )
  return (
    value.builtin === false &&
    value.preset === null &&
    string(value.name) &&
    string(value.icon) &&
    (value.emoji === undefined || string(value.emoji)) &&
    ['list', 'gallery'].includes(String(value.presentation)) &&
    ['vertical', 'columns'].includes(String(value.arrangement)) &&
    number(value.columnCount) &&
    Number.isInteger(value.columnCount) &&
    value.columnCount >= 1 &&
    value.columnCount <= 4 &&
    number(value.sortOrder) &&
    ['manual', 'due', 'created', 'title'].includes(String(value.sort)) &&
    Array.isArray(value.panels) &&
    value.panels.every(
      (p) =>
        record(p) &&
        string(p.id) &&
        string(p.name) &&
        string(p.emoji) &&
        number(p.span) &&
        Number.isInteger(p.span) &&
        p.span >= 1 &&
        p.span <= 4 &&
        (p.presentation === undefined || ['list', 'gallery'].includes(String(p.presentation))) &&
        ['manual', 'due', 'created', 'title'].includes(String(p.sort)) &&
        filter(p.filter),
    )
  )
}
export function parseDocument(raw: string): SyncDocument {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    throw new Error('sync.invalidData')
  }
  if (
    !record(value) ||
    value.format !== 'pantodo-webdav' ||
    value.version !== 1 ||
    !record(value.data)
  )
    throw new Error('sync.invalidData')
  const data = emptyData()
  for (const collection of COLLECTIONS) {
    const entries = value.data[collection]
    if (
      !record(entries) ||
      Object.keys(entries).some((id) => ['__proto__', 'constructor', 'prototype'].includes(id)) ||
      !Object.entries(entries).every(([id, v]) => valid(collection, v, id))
    )
      throw new Error('sync.invalidData')
    // Copy only protocol collections; credentials, local settings and live timers never enter the document.
    Object.assign(data[collection], entries)
  }
  return { format: 'pantodo-webdav', version: 1, data }
}
