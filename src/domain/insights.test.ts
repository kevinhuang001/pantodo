import { describe, it, expect } from 'vitest'
import { hourlyFocus } from './insights'
import type { TimeEntry } from './types'
function entry(startedAt: string, endedAt: string): TimeEntry {
  return {
    id: 'one',
    taskId: null,
    startedAt,
    endedAt,
    note: '',
    source: 'manual',
    createdAt: startedAt,
    updatedAt: endedAt,
    deletedAt: null,
  }
}
describe('hourly focus distribution', () => {
  it('splits a cross-midnight record between weekdays and preserves all minutes', () => {
    const start = new Date(2026, 9, 18, 23, 30),
      end = new Date(2026, 9, 19, 1, 15)
    const heat = hourlyFocus([entry(start.toISOString(), end.toISOString())], start, end)
    expect(heat.find(([hour, day]) => hour === 23 && day === 6)?.[2]).toBe(30)
    expect(heat.find(([hour, day]) => hour === 0 && day === 0)?.[2]).toBe(60)
    expect(heat.find(([hour, day]) => hour === 1 && day === 0)?.[2]).toBe(15)
    expect(heat.reduce((sum, v) => sum + v[2]!, 0)).toBe(105)
  })
  it('clips records to the filter and sums overlapping category-independent entries', () => {
    const start = new Date(2026, 9, 19, 10, 15),
      end = new Date(2026, 9, 19, 10, 45)
    const record = entry(
      new Date(2026, 9, 19, 9).toISOString(),
      new Date(2026, 9, 19, 12).toISOString(),
    )
    expect(hourlyFocus([record], start, end).reduce((sum, v) => sum + v[2]!, 0)).toBe(30)
    expect(hourlyFocus([], start, end).every((v) => v[2] === 0)).toBe(true)
  })
})
