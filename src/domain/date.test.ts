import { describe, expect, it } from 'vitest'

import {
  byId,
  colorIndexForName,
  formatMinutes,
  fromLocalInputValue,
  isSameLocalDay,
  toLocalInputValue,
} from './date'

describe('formatMinutes', () => {
  it('formats minutes, hours and mixed durations', () => {
    expect(formatMinutes(0)).toBe('0m')
    expect(formatMinutes(45)).toBe('45m')
    expect(formatMinutes(60)).toBe('1h')
    expect(formatMinutes(90)).toBe('1h 30m')
    expect(formatMinutes(125)).toBe('2h 5m')
  })
})

describe('datetime-local round trip', () => {
  it('round-trips through the local timezone', () => {
    const value = '2026-03-05T09:30'
    const iso = fromLocalInputValue(value)
    expect(toLocalInputValue(iso)).toBe(value)
  })
})

describe('isSameLocalDay', () => {
  it('compares calendar days in local time', () => {
    const day = new Date(2026, 2, 5, 12, 0, 0)
    expect(isSameLocalDay(new Date(2026, 2, 5, 0, 1, 0).toISOString(), day)).toBe(true)
    expect(isSameLocalDay(new Date(2026, 2, 5, 23, 59, 0).toISOString(), day)).toBe(true)
    expect(isSameLocalDay(new Date(2026, 2, 6, 0, 0, 0).toISOString(), day)).toBe(false)
  })
})

describe('colorIndexForName', () => {
  it('is stable, in range and spreads different names', () => {
    expect(colorIndexForName('重要', 8)).toBe(colorIndexForName('重要', 8))
    for (const name of ['重要', '紧急', '产品', '深度工作', '行政']) {
      const index = colorIndexForName(name, 8)
      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThan(8)
    }
    expect(colorIndexForName('重要', 8)).not.toBe(colorIndexForName('紧急', 8))
  })
})

describe('byId', () => {
  it('indexes entities by id', () => {
    const map = byId([{ id: 'a' }, { id: 'b' }])
    expect(map.get('b')).toEqual({ id: 'b' })
    expect(map.size).toBe(2)
  })
})
