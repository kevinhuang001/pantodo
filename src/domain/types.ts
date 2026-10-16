/** Domain model. Mirrors the SQLite schema in docs/SPEC.md one-to-one. */

export type Id = string

/** ISO-8601 instant, always stored in UTC. */
export type IsoDateTime = string

export type TaskStatus = 'todo' | 'doing' | 'done' | 'cancelled'

export const TASK_STATUSES: readonly TaskStatus[] = ['todo', 'doing', 'done', 'cancelled']

/** Soft delete doubles as the sync tombstone, so every entity carries the same envelope. */
export interface Entity {
  id: Id
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
  deletedAt: IsoDateTime | null
}

export interface Project extends Entity {
  name: string
  /** `null` means "assign a colour from the name hash". */
  color: string | null
  sortOrder: number
  archivedAt: IsoDateTime | null
}

export interface Tag extends Entity {
  name: string
  color: string | null
  sortOrder: number
}

export interface Task extends Entity {
  title: string
  notes: string
  status: TaskStatus
  projectId: Id | null
  /** Deadline: drives reminders and sorting, never occupies the timetable grid. */
  dueAt: IsoDateTime | null
  estimateMinutes: number | null
  completedAt: IsoDateTime | null
  archivedAt: IsoDateTime | null
  sortOrder: number
}

/** A scheduled block is what puts a task on the timetable. */
export interface ScheduleBlock extends Entity {
  taskId: Id
  startAt: IsoDateTime
  endAt: IsoDateTime
}

export type GroupField = 'tag' | 'project' | 'status' | 'none'
export type GroupArrangement = 'vertical' | 'columns' | 'grid'
export type ViewLayout = 'list' | 'board' | 'quadrant' | 'timetable'
export type TagMatchMode = 'any' | 'all'
export type ViewSort = 'manual' | 'due' | 'created' | 'title'
export type HasTime = 'any' | 'scheduled' | 'unscheduled'

/** Built-in views need dynamic predicates ("today" moves), so they carry a preset marker. */
export type ViewPreset = 'inbox' | 'today' | 'upcoming' | 'all' | 'trash'

export interface ViewFilter {
  tagIds: Id[]
  tagMode: TagMatchMode
  projectIds: Id[]
  statuses: TaskStatus[]
  hasTime: HasTime
  text: string
}

/** A named bucket inside a view — this is what makes the Eisenhower matrix four tags. */
export interface GroupRule {
  tagIds: Id[]
  tagMode: TagMatchMode
  excludeTagIds: Id[]
}

export interface ViewGroup {
  id: Id
  label: string
  color: string | null
  rule: GroupRule
  sortOrder: number
}

export interface View extends Entity {
  name: string
  icon: string
  builtin: boolean
  preset: ViewPreset | null
  filter: ViewFilter
  groupBy: GroupField
  arrangement: GroupArrangement
  gridColumns: number
  layout: ViewLayout
  sort: ViewSort
  groups: ViewGroup[]
  sortOrder: number
}

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'
export type LocalePreference = 'system' | 'zh-CN' | 'en' | 'ja'

export interface Settings {
  theme: ThemePreference
  localePreference: LocalePreference
  /** 0 = Sunday, 1 = Monday. The spec fixes Monday. */
  weekStartsOn: 0 | 1
  reminderLeadMinutes: number
  notificationsSilent: boolean
  seedVersion: number
}

/** The whole workspace, as persisted and as handed to the UI in one shot. */
export interface Workspace {
  projects: Project[]
  tags: Tag[]
  tasks: Task[]
  taskTags: Record<Id, Id[]>
  scheduleBlocks: ScheduleBlock[]
  views: View[]
  settings: Settings
}

export const EMPTY_FILTER: ViewFilter = {
  tagIds: [],
  tagMode: 'any',
  projectIds: [],
  statuses: [],
  hasTime: 'any',
  text: '',
}

export function isOpenTask(task: Task): boolean {
  return (
    task.deletedAt === null &&
    task.archivedAt === null &&
    task.status !== 'done' &&
    task.status !== 'cancelled'
  )
}

export function isDoneTask(task: Task): boolean {
  return task.status === 'done'
}

/** Checkbox behaviour: todo → doing → done → todo. */
export function nextStatus(status: TaskStatus): TaskStatus {
  switch (status) {
    case 'todo':
      return 'doing'
    case 'doing':
      return 'done'
    case 'done':
    case 'cancelled':
    default:
      return 'todo'
  }
}
