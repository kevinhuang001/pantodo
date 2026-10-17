import { describe, expect, it } from 'vitest'
import { placeTimeline } from './calendar'
import { createSeedWorkspace } from './presets'

describe('calendar deadline lanes', () => {
  it('packs a deadline separately from its overlapping plan while keeping the correct time', () => {
    const task = {
      ...createSeedWorkspace({ withDemoData: true }).tasks[0]!,
      startAt: new Date(2026, 9, 19, 10).toISOString(),
      endAt: new Date(2026, 9, 19, 11).toISOString(),
      dueAt: new Date(2026, 9, 19, 10, 30).toISOString(),
    }
    const items = placeTimeline([task], new Date(2026, 9, 19), 24)
    expect(items).toHaveLength(2)
    expect(items.map((i) => i.lanes)).toEqual([2, 2])
    expect(items[0]!.lane).not.toBe(items[1]!.lane)
    expect(items[1]!.start).toBe(630)
  })
  it('does not reserve unnecessary columns when deadlines and plans do not overlap', () => {
    const task = {
      ...createSeedWorkspace({ withDemoData: true }).tasks[0]!,
      startAt: new Date(2026, 9, 19, 10).toISOString(),
      endAt: new Date(2026, 9, 19, 11).toISOString(),
      dueAt: new Date(2026, 9, 19, 15).toISOString(),
    }
    expect(placeTimeline([task], new Date(2026, 9, 19)).every((i) => i.lanes === 1)).toBe(true)
  })
})
