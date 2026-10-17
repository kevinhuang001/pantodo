import { describe, it, expect } from 'vitest'
import { changeSchedule, type ScheduleValues } from './planning'
const empty: ScheduleValues = { start: '', end: '', due: '', estimate: '' }
describe('capture planning', () => {
  it('keeps an endpoint explicit until the user selects the other endpoint', () => {
    expect(changeSchedule(empty, 'start', '2026-10-19T23:45')).toEqual({
      ...empty,
      start: '2026-10-19T23:45',
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
