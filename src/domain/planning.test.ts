import { describe, it, expect } from 'vitest'
import { changeDuration, changeSchedule, type ScheduleValues } from './planning'
const empty: ScheduleValues = { start: '', end: '', due: '', estimate: '' }
describe('capture planning', () => {
  it('calculates a default end across midnight from a newly selected start', () => {
    expect(changeSchedule(empty, 'start', '2026-10-19T23:45')).toEqual({
      ...empty,
      start: '2026-10-19T23:45',
      end: '2026-10-20T00:15',
    })
    expect(changeSchedule(empty, 'end', '2026-10-20T00:15')).toEqual({
      ...empty,
      end: '2026-10-20T00:15',
    })
  })
  it('moves the complete plan while retaining its custom duration and independent deadline', () => {
    const value = {
      ...empty,
      start: '2026-10-19T10:00',
      end: '2026-10-19T11:30',
      due: '2026-10-22T20:00',
    }
    expect(changeSchedule(value, 'start', '2026-10-21T13:00')).toMatchObject({
      start: '2026-10-21T13:00',
      end: '2026-10-21T14:30',
      due: value.due,
    })
  })
  it('recalculates the end from duration and leaves the deadline independent', () => {
    const value = {
      ...empty,
      start: '2026-10-19T23:45',
      end: '2026-10-20T00:15',
      due: '2026-10-22T10:00',
    }
    expect(changeDuration(value, '95')).toEqual({
      ...value,
      end: '2026-10-20T01:20',
      estimate: '95',
    })
    expect(changeDuration(value, '0')).toEqual(value)
    expect(changeSchedule(changeDuration(empty, '90'), 'start', value.start).end).toBe(
      '2026-10-20T01:15',
    )
  })
  it('clears a planned interval together without deleting a deadline or estimate', () => {
    const value = {
      start: '2026-10-19T10:00',
      end: '2026-10-19T11:00',
      due: '2026-10-20T15:00',
      estimate: '90',
    }
    expect(changeSchedule(value, 'end', '')).toEqual({ ...value, start: '', end: '' })
    expect(changeSchedule(value, 'due', '')).toEqual({ ...value, due: '' })
  })
})
