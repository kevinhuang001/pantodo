import { describe, expect, it } from 'vitest'

import { dueState, groupTasks, matchesFilter, selectTasks, sortTasks } from './filters'
import type { FilterContext } from './filters'
import { EMPTY_FILTER } from './types'
import type { Project, Tag, Task, View, ViewFilter, ViewPreset } from './types'

const NOW = new Date(2026, 2, 5, 9, 0, 0)
const at = (hour: number, minute = 0, day = 5): string =>
  new Date(2026, 2, day, hour, minute, 0).toISOString()

const PALETTE = ['#111111', '#222222', '#333333', '#444444'] as const

function makeTask(id: string, partial: Partial<Task> = {}): Task {
  return {
    id,
    createdAt: at(7),
    updatedAt: at(7),
    deletedAt: null,
    title: `task ${id}`,
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
    ...partial,
  }
}

function makeView(
  preset: ViewPreset | null,
  filter: Partial<ViewFilter> = {},
  extra: Partial<View> = {},
): View {
  return {
    id: `view-${preset ?? 'custom'}`,
    createdAt: at(7),
    updatedAt: at(7),
    deletedAt: null,
    name: preset ?? 'custom',
    icon: 'list',
    builtin: preset !== null,
    preset,
    filter: { ...EMPTY_FILTER, ...filter },
    groupBy: 'none',
    arrangement: 'vertical',
    gridColumns: 2,
    sort: 'manual',
    groups: [],
    sortOrder: 0,
    ...extra,
  }
}

function context(taskTags: Record<string, string[]> = {}): FilterContext {
  return { taskTags, now: NOW }
}

describe('matchesFilter', () => {
  const empty = context()

  it('requires all tags in "all" mode and any tag in "any" mode', () => {
    const tags = { a: ['t1'], b: ['t1', 't2'], c: ['t2'] }
    const ctx = context(tags)
    const any = makeView('all', { tagIds: ['t1'] })
    const all = makeView('all', { tagIds: ['t1', 't2'], tagMode: 'all' })

    expect(matchesFilter(makeTask('a'), any.filter, ctx)).toBe(true)
    expect(matchesFilter(makeTask('c'), any.filter, ctx)).toBe(false)
    expect(matchesFilter(makeTask('a'), all.filter, ctx)).toBe(false)
    expect(matchesFilter(makeTask('b'), all.filter, ctx)).toBe(true)
  })

  it('filters by project, status and text', () => {
    expect(
      matchesFilter(
        makeTask('a', { projectId: 'p1' }),
        makeView('all', { projectIds: ['p1'] }).filter,
        empty,
      ),
    ).toBe(true)
    expect(
      matchesFilter(
        makeTask('a', { projectId: null }),
        makeView('all', { projectIds: ['p1'] }).filter,
        empty,
      ),
    ).toBe(false)
    expect(
      matchesFilter(
        makeTask('a', { status: 'done' }),
        makeView('all', { statuses: ['done'] }).filter,
        empty,
      ),
    ).toBe(true)
    expect(
      matchesFilter(makeTask('a'), makeView('all', { statuses: ['done'] }).filter, empty),
    ).toBe(false)
    expect(
      matchesFilter(
        makeTask('a', { title: '写周报' }),
        makeView('all', { text: '周报' }).filter,
        empty,
      ),
    ).toBe(true)
    expect(
      matchesFilter(
        makeTask('a', { notes: '季度复盘' }),
        makeView('all', { text: '复盘' }).filter,
        empty,
      ),
    ).toBe(true)
    expect(
      matchesFilter(makeTask('a', { title: 'x' }), makeView('all', { text: 'y' }).filter, empty),
    ).toBe(false)
  })

  it('filters on whether a task occupies the timetable', () => {
    const ctx = context()
    expect(
      matchesFilter(
        makeTask('scheduled', { startAt: at(10), endAt: at(11) }),
        makeView('all', { hasTime: 'scheduled' }).filter,
        ctx,
      ),
    ).toBe(true)
    expect(
      matchesFilter(makeTask('free'), makeView('all', { hasTime: 'scheduled' }).filter, ctx),
    ).toBe(false)
    expect(
      matchesFilter(makeTask('free'), makeView('all', { hasTime: 'unscheduled' }).filter, ctx),
    ).toBe(true)
  })

  it('never matches a deleted task', () => {
    const deleted = makeTask('gone', { deletedAt: at(8) })
    expect(matchesFilter(deleted, EMPTY_FILTER, empty)).toBe(false)
  })
})

describe('selectTasks with built-in presets', () => {
  const tasks = [
    makeTask('dueToday', { dueAt: at(18) }),
    makeTask('dueTomorrow', { dueAt: at(18, 0, 6) }),
    makeTask('dueYesterday', { dueAt: at(18, 0, 4) }),
    makeTask('scheduledToday', { startAt: at(14), endAt: at(15) }),
    makeTask('projectTask', { projectId: 'p1' }),
    makeTask('deleted', { deletedAt: at(8) }),
    makeTask('archived', { archivedAt: at(8) }),
  ]
  const ctx = context()

  it('Today means due today OR scheduled today', () => {
    const selected = selectTasks(tasks, makeView('today'), ctx).map((task) => task.id)
    expect(selected).toContain('dueToday')
    expect(selected).toContain('scheduledToday')
    expect(selected).not.toContain('dueTomorrow')
    expect(selected).not.toContain('dueYesterday')
    expect(selected).not.toContain('deleted')
  })

  it('Inbox holds tasks without a project', () => {
    const selected = selectTasks(tasks, makeView('inbox'), ctx).map((task) => task.id)
    expect(selected).toContain('dueToday')
    expect(selected).not.toContain('projectTask')
  })

  it('Trash shows only deleted tasks', () => {
    const selected = selectTasks(tasks, makeView('trash'), ctx).map((task) => task.id)
    expect(selected).toEqual(['deleted'])
  })

  it('All hides deleted and archived tasks', () => {
    const selected = selectTasks(tasks, makeView('all'), ctx).map((task) => task.id)
    expect(selected).not.toContain('deleted')
    expect(selected).not.toContain('archived')
  })
})

describe('groupTasks', () => {
  const tags: Tag[] = [
    {
      id: 'important',
      name: '重要',
      color: null,
      sortOrder: 0,
      createdAt: at(7),
      updatedAt: at(7),
      deletedAt: null,
    },
    {
      id: 'urgent',
      name: '紧急',
      color: null,
      sortOrder: 1,
      createdAt: at(7),
      updatedAt: at(7),
      deletedAt: null,
    },
  ]
  const projects: Project[] = [
    {
      id: 'p1',
      name: '产品',
      color: null,
      sortOrder: 0,
      archivedAt: null,
      createdAt: at(7),
      updatedAt: at(7),
      deletedAt: null,
    },
  ]
  const taskTags = {
    both: ['important', 'urgent'],
    importantOnly: ['important'],
    urgentOnly: ['urgent'],
    neither: [],
  }
  const ctx = context(taskTags)
  const tasks = ['both', 'importantOnly', 'urgentOnly', 'neither'].map((id) =>
    makeTask(id, { projectId: id === 'both' ? 'p1' : null }),
  )

  it('honours pinned groups, which is how the Eisenhower matrix is expressed', () => {
    const view = makeView(
      null,
      {},
      {
        groupBy: 'tag',
        groups: [
          {
            id: 'g1',
            label: '重要且紧急',
            color: null,
            sortOrder: 0,
            rule: { tagIds: ['important', 'urgent'], tagMode: 'all', excludeTagIds: [] },
          },
          {
            id: 'g2',
            label: '重要不紧急',
            color: null,
            sortOrder: 1,
            rule: { tagIds: ['important'], tagMode: 'all', excludeTagIds: ['urgent'] },
          },
          {
            id: 'g3',
            label: '紧急不重要',
            color: null,
            sortOrder: 2,
            rule: { tagIds: ['urgent'], tagMode: 'all', excludeTagIds: ['important'] },
          },
          {
            id: 'g4',
            label: '都不',
            color: null,
            sortOrder: 3,
            rule: { tagIds: [], tagMode: 'all', excludeTagIds: ['important', 'urgent'] },
          },
        ],
      },
    )

    const groups = groupTasks(tasks, view, ctx, tags, projects, PALETTE)
    expect(groups.map((group) => group.tasks.map((task) => task.id))).toEqual([
      ['both'],
      ['importantOnly'],
      ['urgentOnly'],
      ['neither'],
    ])
  })

  it('adds an "other" bucket for tasks no pinned group claims', () => {
    const view = makeView(
      null,
      {},
      {
        groups: [
          {
            id: 'g1',
            label: '紧急',
            color: null,
            sortOrder: 0,
            rule: { tagIds: ['urgent'], tagMode: 'all', excludeTagIds: [] },
          },
        ],
      },
    )
    const groups = groupTasks(tasks, view, ctx, tags, projects, PALETTE)
    expect(groups).toHaveLength(2)
    expect(groups[1]?.labelKey).toBe('group.uncategorized')
    expect(groups[1]?.tasks.map((task) => task.id)).toEqual(['importantOnly', 'neither'])
  })

  it('derives tag buckets and an untagged bucket when no groups are pinned', () => {
    const view = makeView(null, {}, { groupBy: 'tag' })
    const groups = groupTasks(tasks, view, ctx, tags, projects, PALETTE)
    expect(groups.map((group) => group.key)).toEqual(['tag:important', 'tag:urgent', 'tag:none'])
    expect(groups[2]?.tasks.map((task) => task.id)).toEqual(['neither'])
  })

  it('derives project buckets plus a "no project" bucket', () => {
    const view = makeView(null, {}, { groupBy: 'project' })
    const groups = groupTasks(tasks, view, ctx, tags, projects, PALETTE)
    expect(groups.map((group) => group.key)).toEqual(['project:p1', 'project:none'])
    expect(groups[0]?.tasks.map((task) => task.id)).toEqual(['both'])
  })

  it('returns a single flat group for the default list layout', () => {
    const groups = groupTasks(tasks, makeView('all'), ctx, tags, projects, PALETTE)
    expect(groups).toHaveLength(1)
    expect(groups[0]?.key).toBe('all')
    expect(groups[0]?.tasks).toHaveLength(4)
  })
})

describe('sortTasks', () => {
  const ctx = context()
  const tasks = [
    makeTask('later', { dueAt: at(20), title: 'b', createdAt: at(9) }),
    makeTask('sooner', { dueAt: at(10), title: 'c', createdAt: at(8) }),
    makeTask('undated', { dueAt: null, title: 'a', createdAt: at(10) }),
  ]

  it('sorts by due date with undated last', () => {
    expect(
      sortTasks(tasks, makeView('all', {}, { sort: 'due' }), ctx).map((task) => task.id),
    ).toEqual(['sooner', 'later', 'undated'])
  })

  it('sorts by title', () => {
    expect(
      sortTasks(tasks, makeView('all', {}, { sort: 'title' }), ctx).map((task) => task.id),
    ).toEqual(['undated', 'later', 'sooner'])
  })

  it('puts in-progress work first in manual order', () => {
    const list = [
      makeTask('a', { status: 'done' }),
      makeTask('b', { status: 'doing' }),
      makeTask('c'),
    ]
    expect(sortTasks(list, makeView('all'), ctx).map((task) => task.id)).toEqual(['b', 'c', 'a'])
  })
})

describe('dueState', () => {
  it('classifies overdue, today and future deadlines', () => {
    expect(dueState(makeTask('a', { dueAt: at(8, 0, 4) }), NOW)).toBe('overdue')
    expect(dueState(makeTask('b', { dueAt: at(20) }), NOW)).toBe('today')
    expect(dueState(makeTask('c', { dueAt: at(20, 0, 6) }), NOW)).toBeNull()
    expect(dueState(makeTask('d', { dueAt: at(8, 0, 4), status: 'done' }), NOW)).toBeNull()
  })
})
