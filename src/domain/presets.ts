import type { TFunction } from '@/i18n'
import { t as translate } from '@/i18n'

import { nowIso } from './date'
import { newId } from './ids'
import { TAG_PALETTE } from './palette'
import type { Settings, Tag, Task, View, ViewGroup, Workspace } from './types'
import { EMPTY_FILTER } from './types'

export const SEED_VERSION = 1

function envelope(): { id: string; createdAt: string; updatedAt: string; deletedAt: null } {
  return { id: newId(), createdAt: nowIso(), updatedAt: nowIso(), deletedAt: null }
}

export function defaultSettings(): Settings {
  return {
    theme: 'system',
    localePreference: 'system',
    weekStartsOn: 1,
    reminderLeadMinutes: 20,
    notificationsSilent: true,
    seedVersion: SEED_VERSION,
  }
}

function makeGroup(
  label: string,
  rule: { tagIds: string[]; tagMode: 'any' | 'all'; excludeTagIds: string[] },
  sortOrder: number,
): ViewGroup {
  return { ...envelope(), label, color: null, rule, sortOrder }
}

function makeView(partial: Partial<View> & { name: string; icon: string }): View {
  return {
    builtin: false,
    preset: null,
    filter: { ...EMPTY_FILTER },
    groupBy: 'none',
    arrangement: 'vertical',
    gridColumns: 2,
    layout: 'list',
    sort: 'manual',
    groups: [],
    sortOrder: 0,
    ...partial,
    ...envelope(),
  }
}

/**
 * The workspace created on first launch: four built-in views plus the Eisenhower example, whose four
 * cells are pinned tag rules rather than a hard-coded feature. Labels are seeded in the language that
 * was active at first run.
 */
export function createSeedWorkspace(
  options: {
    t?: TFunction
    withDemoData?: boolean
    now?: Date
  } = {},
): Workspace {
  const t = options.t ?? translate
  const now = options.now ?? new Date()

  const importantTag: Tag = {
    ...envelope(),
    name: t('seed.tagImportant'),
    color: TAG_PALETTE[4]!,
    sortOrder: 0,
  }
  const urgentTag: Tag = {
    ...envelope(),
    name: t('seed.tagUrgent'),
    color: TAG_PALETTE[2]!,
    sortOrder: 1,
  }

  const quadrant = makeView({
    name: t('nav.quadrant'),
    icon: 'grid',
    builtin: true,
    preset: null,
    groupBy: 'tag',
    arrangement: 'grid',
    gridColumns: 2,
    layout: 'quadrant',
    sortOrder: 4,
    groups: [
      makeGroup(
        t('quadrant.importantUrgent'),
        { tagIds: [importantTag.id, urgentTag.id], tagMode: 'all', excludeTagIds: [] },
        0,
      ),
      makeGroup(
        t('quadrant.importantOnly'),
        { tagIds: [importantTag.id], tagMode: 'all', excludeTagIds: [urgentTag.id] },
        1,
      ),
      makeGroup(
        t('quadrant.urgentOnly'),
        { tagIds: [urgentTag.id], tagMode: 'all', excludeTagIds: [importantTag.id] },
        2,
      ),
      makeGroup(
        t('quadrant.neither'),
        { tagIds: [], tagMode: 'all', excludeTagIds: [importantTag.id, urgentTag.id] },
        3,
      ),
    ],
  })

  const views: View[] = [
    makeView({ name: t('nav.inbox'), icon: 'inbox', builtin: true, preset: 'inbox', sortOrder: 0 }),
    makeView({ name: t('nav.today'), icon: 'sun', builtin: true, preset: 'today', sortOrder: 1 }),
    makeView({
      name: t('nav.upcoming'),
      icon: 'calendar',
      builtin: true,
      preset: 'upcoming',
      sortOrder: 2,
    }),
    makeView({ name: t('nav.all'), icon: 'list', builtin: true, preset: 'all', sortOrder: 3 }),
    quadrant,
    makeView({ name: t('nav.trash'), icon: 'trash', builtin: true, preset: 'trash', sortOrder: 5 }),
  ]

  const workspace: Workspace = {
    projects: [],
    tags: [importantTag, urgentTag],
    tasks: [],
    taskTags: {},
    scheduleBlocks: [],
    views,
    settings: defaultSettings(),
  }

  if (options.withDemoData === true) {
    return withDemoData(workspace, t, now)
  }
  return workspace
}

/** Browser-fixture-only sample content, so the UI and screenshots are not empty. */
function withDemoData(workspace: Workspace, t: TFunction, now: Date): Workspace {
  const project: Workspace['projects'][number] = {
    ...envelope(),
    name: t('seed.projectProduct'),
    color: TAG_PALETTE[7]!,
    sortOrder: 0,
    archivedAt: null,
  }

  const deepWork: Tag = {
    ...envelope(),
    name: t('seed.tagDeepWork'),
    color: TAG_PALETTE[0]!,
    sortOrder: 2,
  }
  const admin: Tag = {
    ...envelope(),
    name: t('seed.tagAdmin'),
    color: TAG_PALETTE[5]!,
    sortOrder: 3,
  }

  const important = workspace.tags[0]!
  const urgent = workspace.tags[1]!

  const at = (dayOffset: number, hour: number, minute = 0): string => {
    const date = new Date(now)
    date.setDate(date.getDate() + dayOffset)
    date.setHours(hour, minute, 0, 0)
    return date.toISOString()
  }

  const makeTask = (
    title: string,
    extra: Partial<Task> & { tagIds?: string[]; block?: { startAt: string; endAt: string } },
  ): void => {
    const { tagIds = [], block, ...rest } = extra
    const task: Task = {
      ...envelope(),
      title,
      notes: '',
      status: 'todo',
      projectId: null,
      dueAt: null,
      estimateMinutes: null,
      completedAt: null,
      archivedAt: null,
      sortOrder: workspace.tasks.length,
      ...rest,
    }
    workspace.tasks.push(task)
    workspace.taskTags[task.id] = tagIds
    if (block !== undefined) {
      workspace.scheduleBlocks.push({ ...envelope(), taskId: task.id, ...block })
    }
  }

  makeTask('写周报', {
    notes: '汇总本周进展与下周计划',
    projectId: project.id,
    dueAt: at(0, 18),
    estimateMinutes: 30,
    tagIds: [admin.id],
    block: { startAt: at(0, 16), endAt: at(0, 17) },
  })
  makeTask('设计评审：时间表交互', {
    projectId: project.id,
    dueAt: at(0, 11),
    estimateMinutes: 60,
    tagIds: [important.id, urgent.id],
    block: { startAt: at(0, 10), endAt: at(0, 11, 30) },
  })
  makeTask('整理四象限视图的预设', {
    notes: '把重要/紧急两个标签的规则固化成示例',
    projectId: project.id,
    dueAt: at(1, 15),
    estimateMinutes: 45,
    tagIds: [important.id, deepWork.id],
  })
  makeTask('回复客户邮件', {
    dueAt: at(0, 9),
    estimateMinutes: 15,
    tagIds: [urgent.id, admin.id],
    block: { startAt: at(0, 9), endAt: at(0, 9, 30) },
  })
  makeTask('重构计时器状态机', {
    notes: '保证刷新后能恢复运行中的计时',
    projectId: project.id,
    estimateMinutes: 180,
    tagIds: [important.id, deepWork.id],
  })
  makeTask('买咖啡豆', { dueAt: at(2, 20), estimateMinutes: null })
  makeTask('预约体检', {
    status: 'done',
    completedAt: at(-1, 12),
    dueAt: at(-1, 12),
    tagIds: [admin.id],
  })
  makeTask('清理旧的任务模板', { dueAt: at(-2, 10), tagIds: [] })

  return {
    ...workspace,
    projects: [project],
    tags: [...workspace.tags, deepWork, admin],
  }
}
