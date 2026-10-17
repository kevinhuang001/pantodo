import { describe, it, expect } from 'vitest'
import { createSeedWorkspace } from './presets'
import { applyTimeCommand, clockLabel, dailySeconds, replaceOverlapping } from './time'
import { placeDay, validatePlan } from './calendar'
import { buildStatistics } from './statistics'
import type { Task, TimeEntry, Workspace } from './types'
const base = new Date('2026-10-19T09:00:00Z')
const stamp = (seconds = 0) => new Date(base.getTime() + seconds * 1000).toISOString()
function task(id = 'a', extra: Partial<Task> = {}): Task {
  return {
    id,
    createdAt: stamp(),
    updatedAt: stamp(),
    deletedAt: null,
    title: id,
    notes: '',
    status: 'todo',
    projectId: null,
    startAt: null,
    endAt: null,
    dueAt: null,
    estimateMinutes: null,
    completedAt: null,
    archivedAt: null,
    sortOrder: 0,
    ...extra,
  }
}
function entry(id: string, start: number, end: number, taskId: string | null = 'a'): TimeEntry {
  return {
    id,
    taskId,
    startedAt: stamp(start),
    endedAt: stamp(end),
    source: 'manual',
    note: '',
    createdAt: stamp(),
    updatedAt: stamp(),
    deletedAt: null,
  }
}
function workspace(): Workspace {
  return { ...createSeedWorkspace(), tasks: [task(), task('b')] }
}
const at = (seconds: number) => new Date(stamp(seconds))
describe('durable work timer', () => {
  it('records only working segments across pause and resume', () => {
    const state = workspace()
    Object.assign(state, applyTimeCommand(state, { kind: 'start', taskId: 'a' }, at(0)))
    Object.assign(state, applyTimeCommand(state, { kind: 'pause' }, at(20)))
    Object.assign(state, applyTimeCommand(state, { kind: 'resume' }, at(200)))
    Object.assign(state, applyTimeCommand(state, { kind: 'stop' }, at(210)))
    expect(state.timer).toBeNull()
    expect(state.timeEntries.map((e) => [e.startedAt, e.endedAt])).toEqual([
      [stamp(0), stamp(20)],
      [stamp(200), stamp(210)],
    ])
    expect(state.tasks[0]?.status).toBe('doing')
  })
  it('stops at the last heartbeat after suspension, never including offline time', () => {
    const state = workspace()
    Object.assign(state, applyTimeCommand(state, { kind: 'start', taskId: 'a' }, at(0)))
    Object.assign(state, applyTimeCommand(state, { kind: 'heartbeat' }, at(5)))
    Object.assign(state, applyTimeCommand(state, { kind: 'heartbeat' }, at(3600)))
    expect(state.timer).toBeNull()
    expect(state.timeEntries[0]?.endedAt).toBe(stamp(5))
  })
  it('switches tasks without allowing simultaneous timers', () => {
    const state = workspace()
    Object.assign(state, applyTimeCommand(state, { kind: 'start', taskId: 'a' }, at(0)))
    Object.assign(state, applyTimeCommand(state, { kind: 'start', taskId: 'b' }, at(15)))
    expect(state.timer?.taskId).toBe('b')
    expect(state.timeEntries).toHaveLength(1)
    expect(state.timeEntries[0]?.endedAt).toBe(stamp(15))
  })
  it('does not transfer timer ownership when another window clicks the running task', () => {
    const state = workspace()
    Object.assign(state, applyTimeCommand(state, { kind: 'start', taskId: 'a' }, at(0), 'one'))
    const result = applyTimeCommand(state, { kind: 'start', taskId: 'a' }, at(5), 'two')
    expect(result.timer?.ownerId).toBe('one')
  })
  it('refuses completed, cancelled or removed Todos', () => {
    const state = workspace()
    state.tasks[0]!.status = 'done'
    expect(() => applyTimeCommand(state, { kind: 'start', taskId: 'a' }, at(0))).toThrow(
      'time.unavailableTask',
    )
  })
  it('formats hours beyond 24 and clamps negative durations', () => {
    expect(clockLabel(90061)).toBe('25:01:01')
    expect(clockLabel(-2)).toBe('00:00:00')
  })
})
describe('manual entries replace whole overlaps', () => {
  it('removes both sides of the old interval instead of splitting it', () => {
    const old = entry('old', 0, 7200),
      next = entry('new', 1800, 3600, 'b')
    const result = replaceOverlapping([old], next, stamp(9000))
    expect(result.filter((item) => !item.deletedAt)).toEqual([next])
    expect(result[0]?.supersededBy).toBe('new')
  })
  it('retains adjacent and unrelated intervals while superseding every overlap', () => {
    const next = entry('new', 60, 120)
    const result = replaceOverlapping(
      [
        entry('touch-left', 0, 60),
        entry('inside', 70, 80),
        entry('cover', 0, 180),
        entry('touch-right', 120, 180),
      ],
      next,
      stamp(300),
    )
    expect(result.filter((item) => !item.deletedAt).map((e) => e.id)).toEqual([
      'touch-left',
      'touch-right',
      'new',
    ])
  })
  it('edits an entry by id without keeping a duplicate', () => {
    const state = workspace()
    state.timeEntries = [entry('a', 0, 60), entry('b', 70, 120)]
    const result = applyTimeCommand(state, { kind: 'save', entry: entry('a', 0, 100) }, at(200))
    expect(result.timeEntries.filter((e) => !e.deletedAt).map((e) => e.id)).toEqual(['a'])
  })
  it('ends an overlapping live timer before replacement', () => {
    const state = workspace()
    Object.assign(state, applyTimeCommand(state, { kind: 'start', taskId: 'a' }, at(0)))
    const result = applyTimeCommand(
      state,
      { kind: 'save', entry: entry('manual', 5, 10, 'b') },
      at(20),
    )
    expect(result.timer).toBeNull()
    expect(result.timeEntries.filter((e) => !e.deletedAt).map((e) => e.id)).toEqual(['manual'])
  })
  it('ends a paused session when manual work replaces its recorded segment', () => {
    const state = workspace()
    Object.assign(state, applyTimeCommand(state, { kind: 'start', taskId: 'a' }, at(0)))
    Object.assign(state, applyTimeCommand(state, { kind: 'pause' }, at(20)))
    const result = applyTimeCommand(
      state,
      { kind: 'save', entry: entry('replacement', 5, 10, 'b') },
      at(40),
    )
    expect(result.timer).toBeNull()
    expect(result.timeEntries.filter((e) => !e.deletedAt).map((e) => e.id)).toEqual(['replacement'])
  })
  it('rejects empty, reversed and future intervals without modifying persisted data', () => {
    const state = workspace()
    expect(() =>
      applyTimeCommand(state, { kind: 'save', entry: entry('x', 5, 0) }, at(20)),
    ).toThrow('time.invalidRange')
    expect(() =>
      applyTimeCommand(state, { kind: 'save', entry: entry('x', 0, 30) }, at(20)),
    ).toThrow('time.future')
    expect(state.timeEntries).toEqual([])
  })
})
describe('calendar plans live on Todos', () => {
  it('requires both ends of an optional positive interval', () => {
    expect(() => validatePlan(null, null)).not.toThrow()
    expect(() => validatePlan(stamp(), null)).toThrow()
    expect(() => validatePlan(stamp(10), stamp(0))).toThrow()
  })
  it('packs separate overlap clusters independently', () => {
    const day = new Date(2026, 9, 19)
    const local = (hour: number) => new Date(2026, 9, 19, hour).toISOString()
    const placed = placeDay(
      [
        task('a', { startAt: local(9), endAt: local(11) }),
        task('b', { startAt: local(10), endAt: local(12) }),
        task('c', { startAt: local(14), endAt: local(15) }),
      ],
      day,
    )
    expect(placed.map((p) => p.lanes)).toEqual([2, 2, 1])
    expect(placed[2]?.start).toBe(840)
  })
  it('clips a spanning Todo into both calendar days', () => {
    const todo = task('overnight', {
      startAt: new Date(2026, 9, 19, 23).toISOString(),
      endAt: new Date(2026, 9, 20, 2).toISOString(),
    })
    expect(placeDay([todo], new Date(2026, 9, 19))[0]?.end).toBe(1440)
    expect(placeDay([todo], new Date(2026, 9, 20))[0]?.end).toBe(120)
  })
})
describe('time statistics', () => {
  it('credits full duration to each tag but deduplicates combined tag filters', () => {
    const state = workspace()
    state.taskTags = { a: ['learn', 'paper'] }
    state.timeEntries = [entry('x', 0, 3600)]
    const result = buildStatistics(
      state,
      { start: at(0), end: at(7200), projectId: '', tagIds: ['learn', 'paper'] },
      at(7200),
    )
    expect(result.total).toBe(3600)
    expect(result.entries).toHaveLength(1)
    expect([...result.byTag.values()]).toEqual([3600, 3600])
  })
  it('excludes superseded records and clips selected periods', () => {
    const state = workspace()
    state.timeEntries = [
      { ...entry('old', 0, 7200), deletedAt: stamp(9000) },
      entry('new', 1800, 3600),
    ]
    const result = buildStatistics(
      state,
      { start: at(2700), end: at(9000), projectId: '', tagIds: [] },
      at(9000),
    )
    expect(result.total).toBe(900)
  })
  it('splits a record at local midnight', () => {
    const start = new Date(2026, 9, 19, 23, 30),
      end = new Date(2026, 9, 20, 0, 30)
    expect(
      dailySeconds(
        [{ startedAt: start.toISOString(), endedAt: end.toISOString() }],
        new Date(2026, 9, 19),
        new Date(2026, 9, 21),
      ).map((day) => day.seconds),
    ).toEqual([1800, 1800])
  })
  it('uses current project attribution and retains orphaned historical work', () => {
    const state = workspace()
    state.tasks[0]!.projectId = 'new-project'
    state.timeEntries = [entry('x', 0, 60), entry('orphan', 60, 120, 'missing')]
    const result = buildStatistics(
      state,
      { start: at(0), end: at(3600), projectId: '', tagIds: [] },
      at(3600),
    )
    expect(result.byProject.get('new-project')).toBe(60)
    expect(result.total).toBe(120)
  })
})
