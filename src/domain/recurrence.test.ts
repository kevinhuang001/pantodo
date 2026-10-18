import { describe, expect, it } from 'vitest'
import { addDays } from 'date-fns'
import { createSeedWorkspace } from './presets'
import { applyTimeCommand } from './time'
import { buildStatistics } from './statistics'
import {
  dateKey,
  localDate,
  occurrences,
  expandTasks,
  listTasks,
  validRecurrence,
} from './recurrence'
import { extractData, parseDocument, applyData } from '@/sync/model'
import type { Task, RecurrenceRule } from './types'
const rule = (patch: Partial<RecurrenceRule> = {}): RecurrenceRule => ({
  frequency: 'daily',
  interval: 1,
  startDate: '2026-10-19',
  weekdays: [1],
  ...patch,
})
const task = (patch: Partial<Task> = {}): Task => ({
  ...createSeedWorkspace({ withDemoData: true }).tasks[0]!,
  startAt: new Date(2026, 9, 19, 10).toISOString(),
  endAt: new Date(2026, 9, 19, 11).toISOString(),
  dueAt: null,
  recurrence: rule(),
  ...patch,
})
const dates = (t: Task, from: string, to: string) =>
  occurrences(t, localDate(from), localDate(to)).map((t) => t.occurrenceKey)
describe('single-source recurring tasks', () => {
  it('expands daily intervals without modifying or cloning stored records', () => {
    const t = task({ recurrence: rule({ interval: 2 }) }),
      before = JSON.stringify(t)
    expect(dates(t, '2026-10-19', '2026-10-26')).toEqual([
      '2026-10-19',
      '2026-10-21',
      '2026-10-23',
      '2026-10-25',
    ])
    expect(JSON.stringify(t)).toBe(before)
    expect(occurrences(t, localDate('2026-10-21'), localDate('2026-10-22'))[0]!.startAt).toBe(
      new Date(2026, 9, 21, 10).toISOString(),
    )
  })
  it('supports selected weekdays, multi-week intervals and occurrence limits', () => {
    const t = task({
      recurrence: rule({ frequency: 'weekly', interval: 2, weekdays: [1, 3, 5], count: 5 }),
      skippedOccurrences: ['2026-10-21'],
    })
    expect(dates(t, '2026-10-01', '2026-12-01')).toEqual([
      '2026-10-19',
      '2026-10-23',
      '2026-11-02',
      '2026-11-04',
    ])
  })
  it('skips invalid month dates and leap days instead of drifting to another date', () => {
    expect(
      dates(
        task({ recurrence: rule({ frequency: 'monthly', startDate: '2026-01-31', count: 3 }) }),
        '2026-01-01',
        '2026-07-01',
      ),
    ).toEqual(['2026-01-31', '2026-03-31', '2026-05-31'])
    expect(
      dates(
        task({ recurrence: rule({ frequency: 'yearly', startDate: '2024-02-29', count: 2 }) }),
        '2024-01-01',
        '2030-01-01',
      ),
    ).toEqual(['2024-02-29', '2028-02-29'])
  })
  it('treats until as inclusive and preserves other cycles after deleting one', () => {
    const t = task({
      recurrence: rule({ until: '2026-10-22' }),
      skippedOccurrences: ['2026-10-20'],
    })
    expect(dates(t, '2026-10-19', '2026-11-01')).toEqual(['2026-10-19', '2026-10-21', '2026-10-22'])
  })
  it('preserves overnight intervals and deadlines beyond the visible start boundary', () => {
    const t = task({
      endAt: new Date(2026, 9, 29, 11).toISOString(),
      dueAt: new Date(2026, 9, 30, 12).toISOString(),
    })
    const rows = expandTasks([t], localDate('2026-11-01'), localDate('2026-11-02'))
    expect(rows.some((t) => t.occurrenceKey === '2026-10-21')).toBe(true)
    const shifted = occurrences(task(), localDate('2026-10-25'), localDate('2026-10-26'))[0]!
    expect(new Date(shifted.startAt!).getHours()).toBe(10)
    expect(new Date(shifted.endAt!).getHours()).toBe(11)
  })
  it('records completion and work against one task, without completing later cycles', () => {
    const t = task({
      occurrenceStates: {
        '2026-10-19': { status: 'done', completedAt: new Date(2026, 9, 19, 12).toISOString() },
      },
    })
    expect(
      occurrences(t, localDate('2026-10-19'), localDate('2026-10-21')).map((t) => t.status),
    ).toEqual(['done', 'todo'])
    const w = createSeedWorkspace({ withDemoData: false })
    w.tasks = [t]
    const next = applyTimeCommand(
      w,
      { kind: 'start', taskId: t.id, occurrenceKey: '2026-10-20' },
      new Date(2026, 9, 20, 10),
    )
    expect(next.tasks).toHaveLength(1)
    expect(next.tasks[0]!.occurrenceStates!['2026-10-20']!.status).toBe('doing')
    expect(next.tasks[0]!.status).toBe(t.status)
    expect(
      buildStatistics(
        w,
        { start: localDate('2026-10-19'), end: localDate('2026-10-21'), projectId: '', tagIds: [] },
        localDate('2026-10-21'),
      ).completed,
    ).toBe(1)
  })
  it('keeps long-lived rules fast and ended series accessible in task lists', () => {
    const t = task({ recurrence: rule({ startDate: '2000-01-01' }) })
    expect(occurrences(t, localDate('2099-01-01'), localDate('2099-01-03'))).toHaveLength(2)
    expect(
      listTasks([task({ recurrence: rule({ count: 2 }) })], localDate('2026-11-01')),
    ).toHaveLength(1)
  })
  it('round-trips only one source task and its exceptions through WebDAV', () => {
    const w = createSeedWorkspace({ withDemoData: false })
    w.tasks = [
      task({
        skippedOccurrences: ['2026-10-20'],
        occurrenceStates: {
          '2026-10-19': { status: 'done', completedAt: new Date(2026, 9, 19, 12).toISOString() },
        },
      }),
    ]
    const data = parseDocument(
      JSON.stringify({ format: 'pantodo-webdav', version: 1, data: extractData(w) }),
    ).data
    expect(Object.keys(data.tasks)).toHaveLength(1)
    expect(applyData(w, data).tasks).toEqual(w.tasks)
    const broken = structuredClone(data)
    broken.tasks[w.tasks[0]!.id]!.task.recurrence!.interval = 0
    expect(() =>
      parseDocument(JSON.stringify({ format: 'pantodo-webdav', version: 1, data: broken })),
    ).toThrow('sync.invalidData')
  })

  it('validates malformed and inconsistent custom rules', () => {
    expect(validRecurrence(rule({ interval: 0 }))).toBe(false)
    expect(validRecurrence(rule({ frequency: 'weekly', weekdays: [] }))).toBe(false)
    expect(validRecurrence(rule({ startDate: '2026-02-30' }))).toBe(false)
    expect(validRecurrence(rule({ until: '2026-10-18' }))).toBe(false)
    expect(dateKey(addDays(localDate('2026-12-31'), 1))).toBe('2027-01-01')
  })
})
