import {
  addDays,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarYears,
  format,
  startOfDay,
  startOfWeek,
} from 'date-fns'
import type { Task, RecurrenceRule } from './types'

export function dateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}
export function localDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}
const validDate = (value: unknown): value is string =>
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

/** Expand only the requested window. Generated occurrences never enter workspace storage. */
export function occurrences(task: Task, from: Date, to: Date, limit = 1000): Task[] {
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
      if (day < start || day >= stop || task.skippedOccurrences?.includes(key)) continue
      const state = task.occurrenceStates?.[key]
      result.push({
        ...task,
        occurrenceKey: key,
        startAt: shift(task.startAt, day),
        endAt: shift(task.endAt, day),
        dueAt: shift(task.dueAt, day),
        status: state?.status ?? (task.status === 'cancelled' ? 'cancelled' : 'todo'),
        completedAt: state?.completedAt ?? null,
      })
      if (result.length >= limit) break
    }
    period++
  }
  return result
}
export function expandTasks(tasks: Task[], from: Date, to: Date): Task[] {
  return tasks.flatMap((task) =>
    task.recurrence && !task.deletedAt
      ? (() => {
          const origin = startOfDay(
            new Date(task.startAt ?? task.dueAt ?? localDate(task.recurrence.startDate)),
          )
          const offsets = [task.startAt, task.endAt, task.dueAt]
            .filter((d): d is string => !!d)
            .map((d) => differenceInCalendarDays(new Date(d), origin))
          return occurrences(
            task,
            addDays(from, -Math.max(0, ...offsets)),
            addDays(to, -Math.min(0, ...offsets)),
          )
        })()
      : [task],
  )
}
/** Lists show today's occurrence or the next non-deleted cycle; calendars expand their visible range. */
export function listTasks(tasks: Task[], now: Date): Task[] {
  return tasks.flatMap((task) => {
    if (!task.recurrence || task.deletedAt || task.archivedAt) return [task]
    const next = occurrences(
      task,
      startOfDay(now),
      addYears(now, Math.max(8, task.recurrence.interval * 8)),
      1,
    )
    if (next.length) return next
    const previous = occurrences(
      task,
      localDate(task.recurrence.startDate),
      addDays(now, 1),
      10000,
    ).at(-1)
    return previous ? [previous] : [task]
  })
}
