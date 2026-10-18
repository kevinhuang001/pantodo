import {
  addDays,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarYears,
  format,
  startOfDay,
  startOfWeek,
} from 'date-fns'
import type { Task, TaskOccurrence, RecurrenceRule } from './types'

export function dateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}
export function localDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}
export const validDate = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  dateKey(localDate(value)) === value
export function validRecurrence(value: unknown): value is RecurrenceRule {
  if (!value || typeof value !== 'object') return false
  const r = value as RecurrenceRule
  return (
    ['daily', 'weekly', 'monthly', 'yearly'].includes(r.frequency) &&
    Number.isInteger(r.interval) &&
    r.interval >= 1 &&
    r.interval <= 999 &&
    validDate(r.startDate) &&
    (r.effectiveFrom === undefined || validDate(r.effectiveFrom)) &&
    Array.isArray(r.weekdays) &&
    r.weekdays.length <= 7 &&
    r.weekdays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) &&
    (r.frequency !== 'weekly' || r.weekdays.length > 0) &&
    (r.until == null || (validDate(r.until) && r.until >= r.startDate)) &&
    (r.count == null || (Number.isInteger(r.count) && r.count > 0 && r.count <= 10000)) &&
    !(r.until && r.count)
  )
}
export function validateRecurrence(rule: RecurrenceRule | null | undefined): void {
  if (rule != null && !validRecurrence(rule)) throw new Error('repeat.invalid')
}

/** Compute previews without creating separate Todos. */
function computedOccurrences(task: Task, from: Date, to: Date, limit = 1000): Task[] {
  const rule = task.recurrence
  if (!rule || !validRecurrence(rule)) return []
  const first = localDate(rule.startDate),
    start = startOfDay(from),
    stop = startOfDay(to)
  const unitDiff =
    rule.frequency === 'daily'
      ? differenceInCalendarDays(start, first)
      : rule.frequency === 'weekly'
        ? differenceInCalendarDays(
            startOfWeek(start, { weekStartsOn: 1 }),
            startOfWeek(first, { weekStartsOn: 1 }),
          ) / 7
        : rule.frequency === 'monthly'
          ? differenceInCalendarMonths(start, first)
          : differenceInCalendarYears(start, first)
  let period = rule.count ? 0 : Math.max(0, Math.floor(unitDiff / rule.interval) - 1)
  let ordinal = 0
  const result: Task[] = []
  const shift = (iso: string | null, day: Date) =>
    iso
      ? addDays(
          new Date(iso),
          differenceInCalendarDays(day, startOfDay(new Date(task.startAt ?? task.dueAt ?? first))),
        ).toISOString()
      : null
  while (result.length < limit) {
    let candidates: Date[]
    if (rule.frequency === 'daily') candidates = [addDays(first, period * rule.interval)]
    else if (rule.frequency === 'weekly') {
      const monday = addDays(startOfWeek(first, { weekStartsOn: 1 }), period * rule.interval * 7)
      candidates = [...new Set(rule.weekdays)]
        .map((d) => addDays(monday, (d + 6) % 7))
        .sort((a, b) => +a - +b)
    } else {
      const year = first.getFullYear() + (rule.frequency === 'yearly' ? period * rule.interval : 0)
      const month = first.getMonth() + (rule.frequency === 'monthly' ? period * rule.interval : 0)
      const monthStart = new Date(year, month, 1)
      if (monthStart >= stop) break
      const day = new Date(year, month, first.getDate())
      candidates = day.getMonth() === monthStart.getMonth() ? [day] : []
    }
    if (candidates.length && candidates[0]! >= stop) break
    for (const day of candidates) {
      if (day < first) continue
      const key = dateKey(day)
      if ((rule.until && key > rule.until) || (rule.count && ordinal >= rule.count)) return result
      ordinal++
      if (day < start || day >= stop || (rule.effectiveFrom && key < rule.effectiveFrom)) continue
      const state = task.occurrences?.[key]
      if (state?.deletedAt) continue
      result.push({
        ...task,
        occurrenceKey: key,
        startAt: state ? state.startAt : shift(task.startAt, day),
        endAt: state ? state.endAt : shift(task.endAt, day),
        dueAt: state ? state.dueAt : shift(task.dueAt, day),
        status: state?.status ?? (task.status === 'cancelled' ? 'cancelled' : 'todo'),
        completedAt: state?.completedAt ?? null,
      })
      if (result.length >= limit) break
    }
    period++
  }
  return result
}
/** A dated snapshot belongs to the one source Todo, never to the top-level task collection. */
export function occurrenceRecord(task: Task, key: string): TaskOccurrence {
  const existing = task.occurrences?.[key]
  if (existing) return existing
  const anchor = startOfDay(
    new Date(task.startAt ?? task.dueAt ?? localDate(task.recurrence?.startDate ?? key)),
  )
  const shift = (value: string | null) =>
    value
      ? addDays(new Date(value), differenceInCalendarDays(localDate(key), anchor)).toISOString()
      : null
  return {
    startAt: shift(task.startAt),
    endAt: shift(task.endAt),
    dueAt: shift(task.dueAt),
    status: 'todo',
    completedAt: null,
    deletedAt: null,
  }
}

/** Catch up through today once per local day; existing snapshots are never overwritten. */
export function materializeTask(task: Task, now: Date): Task {
  if (!task.recurrence || task.deletedAt || task.archivedAt) return task
  const old = task as Task & {
    occurrenceStates?: Record<string, { status: Task['status']; completedAt: string | null }>
    skippedOccurrences?: string[]
  }
  const upgrading = old.occurrenceStates !== undefined || old.skippedOccurrences !== undefined
  const today = dateKey(now)
  if (!upgrading && task.occurrencesThrough === today) return task
  const records = { ...task.occurrences }
  for (const [key, state] of Object.entries(old.occurrenceStates ?? {})) {
    if (
      validDate(key) &&
      ['todo', 'doing', 'done', 'cancelled'].includes(state.status) &&
      (state.completedAt === null || Number.isFinite(Date.parse(state.completedAt))) &&
      !records[key]
    )
      records[key] = { ...occurrenceRecord(task, key), ...state }
  }
  for (const key of old.skippedOccurrences ?? []) {
    if (validDate(key))
      records[key] = {
        ...(records[key] ?? occurrenceRecord(task, key)),
        deletedAt: records[key]?.deletedAt ?? now.toISOString(),
      }
  }
  const from = task.occurrencesThrough
    ? addDays(localDate(task.occurrencesThrough), 1)
    : localDate(task.recurrence.effectiveFrom ?? task.recurrence.startDate)
  for (const row of computedOccurrences(
    { ...task, occurrences: records },
    from,
    addDays(startOfDay(now), 1),
    Infinity,
  )) {
    const key = row.occurrenceKey!
    if (!records[key]) records[key] = occurrenceRecord(task, key)
  }
  const next: typeof old = {
    ...task,
    occurrences: records,
    occurrencesThrough: today,
    updatedAt: now.toISOString(),
  }
  delete next.occurrenceStates
  delete next.skippedOccurrences
  return next
}

/** Saved cycles survive future schedule changes; future cycles remain computed previews. */
export function occurrences(task: Task, from: Date, to: Date, limit = 1000): Task[] {
  const rows = new Map(
    computedOccurrences(task, from, to, limit).map((row) => [row.occurrenceKey!, row]),
  )
  const first = dateKey(startOfDay(from)),
    last = dateKey(startOfDay(to))
  for (const [key, state] of Object.entries(task.occurrences ?? {})) {
    if (key < first || key >= last) continue
    if (state.deletedAt) rows.delete(key)
    else rows.set(key, { ...task, ...state, deletedAt: task.deletedAt, occurrenceKey: key })
  }
  return [...rows.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, limit)
    .map(([, row]) => row)
}
export function expandTasks(tasks: Task[], from: Date, to: Date): Task[] {
  return tasks.flatMap((task) => {
    if ((!task.recurrence && !task.occurrences) || task.deletedAt) return [task]
    const origin = startOfDay(
      new Date(
        task.startAt ??
          task.dueAt ??
          localDate(
            task.recurrence?.startDate ?? Object.keys(task.occurrences ?? {})[0] ?? dateKey(from),
          ),
      ),
    )
    const offsets = [task.startAt, task.endAt, task.dueAt]
      .filter((d): d is string => !!d)
      .map((d) => differenceInCalendarDays(new Date(d), origin))
    const rows = occurrences(
      task,
      addDays(from, -Math.max(0, ...offsets)),
      addDays(to, -Math.min(0, ...offsets)),
      Infinity,
    )
    const keys = new Set(rows.map((row) => row.occurrenceKey))
    for (const [key, state] of Object.entries(task.occurrences ?? {})) {
      if (state.deletedAt || keys.has(key)) continue
      if (
        (state.startAt &&
          state.endAt &&
          new Date(state.startAt) < to &&
          new Date(state.endAt) > from) ||
        (state.dueAt && new Date(state.dueAt) >= from && new Date(state.dueAt) < to)
      )
        rows.push({ ...task, ...state, deletedAt: task.deletedAt, occurrenceKey: key })
    }
    return rows
  })
}
/** Lists include every saved historical and current cycle, never future previews. */
export function listTasks(tasks: Task[], now: Date): Task[] {
  const today = dateKey(now)
  return tasks.flatMap((task) => {
    if ((!task.recurrence && !task.occurrences) || task.deletedAt || task.archivedAt) return [task]
    const source = materializeTask(task, now)
    return Object.entries(source.occurrences ?? {})
      .filter(([key, state]) => key <= today && !state.deletedAt)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, state]) => ({
        ...source,
        ...state,
        deletedAt: source.deletedAt,
        occurrenceKey: key,
      }))
  })
}
export function taskInstanceId(task: Task): string {
  return task.id + (task.occurrenceKey ? '::' + task.occurrenceKey : '')
}
