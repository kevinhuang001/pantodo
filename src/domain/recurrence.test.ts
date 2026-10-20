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
  occurrenceRecord,
  materializeTask,
  taskInstanceId,
} from './recurrence'
import { extractData, parseDocument, applyData, mergeData } from '@/sync/model'
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
      occurrences: {
        '2026-10-21': {
          ...occurrenceRecord(task(), '2026-10-21'),
          deletedAt: new Date().toISOString(),
        },
      },
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
      occurrences: {
        '2026-10-20': {
          ...occurrenceRecord(task(), '2026-10-20'),
          deletedAt: new Date().toISOString(),
        },
      },
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
      occurrences: {
        '2026-10-19': {
          ...occurrenceRecord(task(), '2026-10-19'),
          status: 'done',
          completedAt: new Date(2026, 9, 19, 12).toISOString(),
        },
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
    expect(next.tasks[0]!.occurrences!['2026-10-20']!.status).toBe('doing')
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
    ).toHaveLength(2)
  })
  it('round-trips only one source task and its exceptions through WebDAV', () => {
    const w = createSeedWorkspace({ withDemoData: false })
    w.tasks = [
      task({
        occurrences: {
          '2026-10-20': {
            ...occurrenceRecord(task(), '2026-10-20'),
            deletedAt: new Date().toISOString(),
          },
          '2026-10-19': {
            ...occurrenceRecord(task(), '2026-10-19'),
            status: 'done',
            completedAt: new Date(2026, 9, 19, 12).toISOString(),
          },
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

describe('durable dated cycles in one Todo', () => {
  it('catches up all past days, remains idempotent, and snapshots times before future edits', () => {
    const original = task()
    const saved = materializeTask(original, new Date(2026, 9, 22, 10))
    expect(Object.keys(saved.occurrences!)).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
    ])
    expect(materializeTask(saved, new Date(2026, 9, 22, 18))).toBe(saved)
    const changed = materializeTask(
      {
        ...saved,
        startAt: new Date(2026, 9, 19, 15).toISOString(),
        endAt: new Date(2026, 9, 19, 16).toISOString(),
      },
      new Date(2026, 9, 23, 10),
    )
    expect(new Date(changed.occurrences!['2026-10-19']!.startAt!).getHours()).toBe(10)
    expect(new Date(changed.occurrences!['2026-10-23']!.startAt!).getHours()).toBe(15)
    expect(changed.occurrences!['2026-10-24']).toBeUndefined()
    const rows = listTasks([changed], new Date(2026, 9, 23))
    expect(rows).toHaveLength(5)
    expect(new Set(rows.map(taskInstanceId)).size).toBe(5)
    expect(new Set(rows.map((row) => row.id)).size).toBe(1)
  })
  it('unlocks tomorrow on completion today, advances repeatedly and never duplicates after reopen', () => {
    const now = localDate('2026-10-19')
    let saved = materializeTask(task(), now)
    expect(Object.keys(saved.occurrences!)).toEqual(['2026-10-19'])
    const complete = (key: string) => {
      saved = materializeTask(
        {
          ...saved,
          occurrences: {
            ...saved.occurrences,
            [key]: { ...saved.occurrences![key]!, status: 'done', completedAt: now.toISOString() },
          },
        },
        now,
      )
    }
    complete('2026-10-19')
    expect(saved.occurrences!['2026-10-20']!.status).toBe('todo')
    expect(listTasks([saved], now).map((t) => t.occurrenceKey)).toEqual([
      '2026-10-20',
      '2026-10-19',
    ])
    complete('2026-10-20')
    expect(saved.occurrences!['2026-10-21']!.status).toBe('todo')
    expect(new Date(saved.occurrences!['2026-10-21']!.startAt!).getDate()).toBe(21)
    const reopened = JSON.parse(JSON.stringify(saved)) as Task
    expect(materializeTask(reopened, now)).toBe(reopened)
    const caughtUp = materializeTask(reopened, localDate('2026-10-23'))
    expect(Object.keys(caughtUp.occurrences!).sort()).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
    ])
    expect(caughtUp.occurrences!['2026-10-20']!.status).toBe('done')
    expect(caughtUp.occurrences!['2026-10-21']!.status).toBe('todo')
  })
  it('does not advance beyond an existing successor when completing an overdue cycle', () => {
    const now = localDate('2026-10-22')
    const saved = materializeTask(task(), now)
    const next = materializeTask(
      {
        ...saved,
        occurrences: {
          ...saved.occurrences,
          '2026-10-19': {
            ...saved.occurrences!['2026-10-19']!,
            status: 'done',
            completedAt: now.toISOString(),
          },
        },
      },
      now,
    )
    expect(Object.keys(next.occurrences!)).toHaveLength(4)
    expect(next.occurrences!['2026-10-23']).toBeUndefined()
  })
  it.each([
    [rule({ frequency: 'weekly', interval: 2, weekdays: [1, 3] }), '2026-10-19', '2026-10-21'],
    [rule({ frequency: 'monthly', startDate: '2026-01-31' }), '2026-01-31', '2026-03-31'],
    [rule({ frequency: 'yearly', startDate: '2024-02-29' }), '2024-02-29', '2028-02-29'],
  ])(
    'uses the schedule for early successors including month-end and leap-year gaps',
    (recurrence, first, second) => {
      const now = localDate(first)
      const source = task({ recurrence, startAt: null, endAt: null })
      const saved = materializeTask(source, now)
      const next = materializeTask(
        {
          ...saved,
          occurrences: {
            ...saved.occurrences,
            [first]: {
              ...saved.occurrences![first]!,
              status: 'done',
              completedAt: now.toISOString(),
            },
          },
        },
        now,
      )
      expect(Object.keys(next.occurrences!)).toEqual([first, second])
    },
  )
  it.each([rule({ count: 1 }), rule({ until: '2026-10-19' })])(
    'stops at count and date limits after completion',
    (recurrence) => {
      const now = localDate('2026-10-19')
      const saved = materializeTask(task({ recurrence }), now)
      const next = materializeTask(
        {
          ...saved,
          occurrences: {
            '2026-10-19': {
              ...saved.occurrences!['2026-10-19']!,
              status: 'done',
              completedAt: now.toISOString(),
            },
          },
        },
        now,
      )
      expect(Object.keys(next.occurrences!)).toEqual(['2026-10-19'])
    },
  )
  it('shows the first scheduled cycle immediately even when the series starts later', () => {
    const saved = materializeTask(task(), localDate('2026-10-17'))
    expect(listTasks([saved], localDate('2026-10-17'))[0]!.occurrenceKey).toBe('2026-10-19')
  })
  it('upgrades sparse legacy exceptions without losing completion or deletion', () => {
    const old = {
      ...task(),
      occurrenceStates: {
        '2026-10-19': {
          status: 'done' as const,
          completedAt: new Date(2026, 9, 19, 12).toISOString(),
        },
      },
      skippedOccurrences: ['2026-10-20'],
    }
    const saved = materializeTask(old, new Date(2026, 9, 21))
    expect(saved.occurrences!['2026-10-19']!.status).toBe('done')
    expect(saved.occurrences!['2026-10-20']!.deletedAt).toBeTruthy()
    expect(saved).not.toHaveProperty('occurrenceStates')
    expect(saved).not.toHaveProperty('skippedOccurrences')
    expect(listTasks([saved], new Date(2026, 9, 21))).toHaveLength(2)
  })
  it('retains history when a rule changes or repeat is disabled', () => {
    const saved = materializeTask(task(), new Date(2026, 9, 21))
    const changed = {
      ...saved,
      recurrence: rule({ frequency: 'weekly', weekdays: [5], effectiveFrom: '2026-10-22' }),
    }
    expect(dates(changed, '2026-10-19', '2026-10-26')).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-23',
    ])
    expect(listTasks([{ ...saved, recurrence: null }], new Date(2026, 9, 25))).toHaveLength(3)
  })
  it('merges changes to different dates but surfaces conflicting changes to the same date', () => {
    const w = createSeedWorkspace({ withDemoData: false })
    const t = materializeTask(task(), new Date(2026, 9, 21))
    w.tasks = [t]
    const base = extractData(w),
      local = structuredClone(base),
      remote = structuredClone(base)
    local.tasks[t.id]!.task.occurrences!['2026-10-19']!.status = 'done'
    remote.tasks[t.id]!.task.occurrences!['2026-10-20']!.status = 'doing'
    const merged = mergeData(base, local, remote)
    expect(merged.conflicts).toHaveLength(0)
    expect(merged.data.tasks[t.id]!.task.occurrences!['2026-10-19']!.status).toBe('done')
    expect(merged.data.tasks[t.id]!.task.occurrences!['2026-10-20']!.status).toBe('doing')
    remote.tasks[t.id]!.task.occurrences!['2026-10-19']!.deletedAt = new Date().toISOString()
    expect(mergeData(base, local, remote).conflicts).toHaveLength(1)
  })
})
