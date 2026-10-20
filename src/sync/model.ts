import { validRecurrence, validDate } from '@/domain/recurrence'
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
/** Merge independent dates without discarding another device's cycle changes. */
function mergeOccurrenceTask(
  base: SyncedTask | null | undefined,
  local: SyncedTask | null | undefined,
  remote: SyncedTask | null | undefined,
): SyncedTask | null {
  if (
    !base ||
    !local ||
    !remote ||
    local.task.deletedAt ||
    remote.task.deletedAt ||
    (!local.task.recurrence && !local.task.occurrences)
  )
    return null
  const metadata = (value: SyncedTask) => {
    const task = { ...value.task }
    delete task.occurrences
    delete task.occurrencesThrough
    // Updated timestamps are envelopes, not shared task content.
    return { ...value, task: { ...task, updatedAt: '' } }
  }
  const b = fingerprint(metadata(base)),
    l = fingerprint(metadata(local)),
    r = fingerprint(metadata(remote))
  const chosen = l === r || r === b ? local : l === b ? remote : null
  if (!chosen) return null
  const records: NonNullable<Task['occurrences']> = {}
  const keys = new Set([
    ...Object.keys(base.task.occurrences ?? {}),
    ...Object.keys(local.task.occurrences ?? {}),
    ...Object.keys(remote.task.occurrences ?? {}),
  ])
  for (const key of keys) {
    const b = base.task.occurrences?.[key],
      l = local.task.occurrences?.[key],
      r = remote.task.occurrences?.[key]
    const bh = fingerprint(b),
      lh = fingerprint(l),
      rh = fingerprint(r)
    if (lh !== rh && rh !== bh && lh !== bh) return null
    const value = lh === rh || rh === bh ? l : r
    if (value) records[key] = value
  }
  const through = [local.task.occurrencesThrough, remote.task.occurrencesThrough]
    .filter((v): v is string => !!v)
    .sort()
    .at(-1)
  return {
    ...chosen,
    task: {
      ...chosen.task,
      occurrences: records,
      occurrencesThrough: through,
      updatedAt: [local.task.updatedAt, remote.task.updatedAt].sort().at(-1)!,
    },
  }
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
      const occurrenceMerge =
        collection === 'tasks'
          ? mergeOccurrenceTask(
              b as SyncedTask | null,
              l as SyncedTask | null,
              r as SyncedTask | null,
            )
          : null
      let result: unknown
      if (localHash === remoteHash || remoteHash === baseHash) result = l
      else if (localHash === baseHash) result = r
      else if (occurrenceMerge) result = occurrenceMerge
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
      (v.occurrencesThrough === undefined || validDate(v.occurrencesThrough)) &&
      (v.occurrences === undefined ||
        (record(v.occurrences) &&
          Object.entries(v.occurrences).every(
            ([key, state]) =>
              validDate(key) &&
              record(state) &&
              ['todo', 'doing', 'done', 'cancelled'].includes(String(state.status)) &&
              ['startAt', 'endAt', 'dueAt', 'completedAt', 'deletedAt'].every((field) =>
                nullableInstant(state[field]),
              ) &&
              ((state.startAt === null && state.endAt === null) ||
                (instant(state.startAt) &&
                  instant(state.endAt) &&
                  Date.parse(String(state.endAt)) > Date.parse(String(state.startAt)))),
          ))) &&
      (v.skippedOccurrences === undefined ||
        (strings(v.skippedOccurrences) && v.skippedOccurrences.every(validDate))) &&
      (v.occurrenceStates === undefined ||
        (record(v.occurrenceStates) &&
          Object.entries(v.occurrenceStates).every(
            ([key, state]) =>
              validDate(key) &&
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
      (value.occurrenceKey == null || validDate(value.occurrenceKey)) &&
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
export class InvalidSyncData extends Error {
  constructor(public readonly location: string) {
    super('sync.invalidData')
  }
}
export function parseDocument(raw: string): SyncDocument {
  let value: unknown
  try {
    value = JSON.parse(raw.replace(/^\uFEFF/, ''))
  } catch {
    throw new Error('sync.invalidData')
  }
  if (
    record(value) &&
    value.format === undefined &&
    record(value.taskTags) &&
    COLLECTIONS.every((key) => Array.isArray((value as Record<string, unknown>)[key]))
  ) {
    const workspace = value as unknown as Workspace
    // Validate identities before extractData can collapse duplicate records.
    for (const collection of COLLECTIONS) {
      const ids = workspace[collection].map((entry) => (record(entry) ? entry.id : undefined))
      if (
        ids.some((id) => !string(id) || ['__proto__', 'constructor', 'prototype'].includes(id)) ||
        new Set(ids).size !== ids.length
      )
        throw new Error('sync.invalidData')
    }
    if (!Object.values(value.taskTags).every(strings)) throw new Error('sync.invalidData')
    value = { format: 'pantodo-webdav', version: 1, data: extractData(workspace) }
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
    // Version 1 documents can omit presentation defaults; never replace explicit invalid values.
    if (collection === 'views' && record(entries)) {
      for (const view of Object.values(entries)) {
        if (!record(view)) continue
        if (view.columnCount === undefined) view.columnCount = 2
        if (Array.isArray(view.panels))
          for (const panel of view.panels) {
            if (!record(panel)) continue
            if (panel.emoji === undefined) panel.emoji = '📌'
            if (panel.span === undefined) panel.span = 1
          }
      }
    }
    if (
      !record(entries) ||
      Object.keys(entries).some((id) => ['__proto__', 'constructor', 'prototype'].includes(id))
    )
      throw new InvalidSyncData(collection)
    const records = Object.entries(entries)
    for (let index = 0; index < records.length; index++) {
      const [id, entry] = records[index]
      if (!valid(collection, entry, id)) throw new InvalidSyncData(`${collection}[${index + 1}]`)
    }
    // Copy only protocol collections; credentials, local settings and live timers never enter the document.
    Object.assign(data[collection], entries)
  }
  return { format: 'pantodo-webdav', version: 1, data }
}
