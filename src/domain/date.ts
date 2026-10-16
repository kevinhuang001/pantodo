import { endOfDay, startOfDay } from 'date-fns'

import type { Id, IsoDateTime } from './types'

export function nowIso(now: Date = new Date()): IsoDateTime {
  return now.toISOString()
}

export function parseIso(value: IsoDateTime): Date {
  return new Date(value)
}

export function startOfDayIso(day: Date): IsoDateTime {
  return startOfDay(day).toISOString()
}

export function endOfDayIso(day: Date): IsoDateTime {
  return endOfDay(day).toISOString()
}

export function isSameLocalDay(value: IsoDateTime, day: Date): boolean {
  const date = parseIso(value)
  return (
    date.getFullYear() === day.getFullYear() &&
    date.getMonth() === day.getMonth() &&
    date.getDate() === day.getDate()
  )
}

export function isOverdue(value: IsoDateTime, now: Date): boolean {
  return parseIso(value).getTime() < now.getTime()
}

/** 2026-03-05T09:30 -> ISO, interpreted in the browser's local zone (datetime-local semantics). */
export function fromLocalInputValue(value: string): IsoDateTime {
  return new Date(value).toISOString()
}

export function toLocalInputValue(value: IsoDateTime): string {
  const date = parseIso(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function toDateInputValue(value: IsoDateTime): string {
  return toLocalInputValue(value).slice(0, 10)
}

/** Locale-aware short date + time, e.g. "3月5日 09:30". */
export function formatDateTime(value: IsoDateTime, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parseIso(value))
}

export function formatDay(value: IsoDateTime, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(parseIso(value))
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

/** Stable colour index for a name, so an uncoloured tag still looks deliberate. */
export function colorIndexForName(name: string, buckets: number): number {
  let hash = 0
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 100000
  }
  return hash % buckets
}

export function unique<T>(values: readonly T[]): T[] {
  return Array.from(new Set(values))
}

export function byId<T extends { id: Id }>(items: readonly T[]): Map<Id, T> {
  return new Map(items.map((item) => [item.id, item]))
}
