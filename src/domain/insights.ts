import type { TimeEntry } from './types'
/** Split records at local hour boundaries, clipping exactly to the selected period. */
export function hourlyFocus(entries: TimeEntry[], start: Date, end: Date) {
  const hours = Array.from({ length: 7 }, () => Array<number>(24).fill(0))
  for (const entry of entries) {
    let cursor = Math.max(Date.parse(entry.startedAt), start.getTime())
    const stop = Math.min(Date.parse(entry.endedAt), end.getTime())
    while (cursor < stop) {
      const date = new Date(cursor)
      const boundary = new Date(cursor)
      boundary.setMinutes(60, 0, 0)
      const next = Math.min(stop, Math.max(cursor + 1, boundary.getTime()))
      hours[(date.getDay() + 6) % 7]![date.getHours()]! += (next - cursor) / 60000
      cursor = next
    }
  }
  return hours.flatMap((row, weekday) =>
    row.map((minutes, hour) => [hour, weekday, Math.round(minutes * 100) / 100]),
  )
}
