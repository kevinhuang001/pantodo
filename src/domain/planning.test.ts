import { describe, it, expect } from 'vitest'
import { changeSchedule, type ScheduleValues } from './planning'
const empty: ScheduleValues = { start: '', end: '', due: '', estimate: '' }
describe('capture planning', () => {
  it('creates a complete interval from either endpoint, including across midnight', () => {
    expect(changeSchedule(empty, 'start', '2026-10-19T23:45', 30)).toMatchObject({
      start: '2026-10-19T23:45',
      end: '2026-10-20T00:15',
    })
    expect(changeSchedule(empty, 'end', '2026-10-20T00:15', 30)).toMatchObject({
      start: '2026-10-19T23:45',
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
    expect(changeSchedule(value, 'start', '2026-10-21T13:00', 30)).toMatchObject({
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
    expect(changeSchedule(value, 'end', '', 30)).toEqual({ ...value, start: '', end: '' })
    expect(changeSchedule(value, 'due', '', 30)).toEqual({ ...value, due: '' })
  })
})
