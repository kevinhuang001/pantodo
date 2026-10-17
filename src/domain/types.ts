/** Persisted Todo workspace. Plans live on Todos; actual work is a separate time ledger. */

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
  emoji?: string
  name: string
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
  /** Planned interval belongs to the Todo; deadline is an independent marker. */
  startAt: IsoDateTime | null
  endAt: IsoDateTime | null
  dueAt: IsoDateTime | null
  estimateMinutes: number | null
  completedAt: IsoDateTime | null
  archivedAt: IsoDateTime | null
  sortOrder: number
}

export type ViewPresentation = 'list' | 'gallery' | 'board' | 'panels'
export type PanelArrangement = 'vertical' | 'columns' | 'grid'
export type AppTab = 'views' | 'timetable' | 'statistics'
export type CalendarMode = 'day' | 'week' | 'month'
export type TagMatchMode = 'any' | 'all'
export type ViewSort = 'manual' | 'due' | 'created' | 'title'
export type HasTime = 'any' | 'scheduled' | 'unscheduled'

/** Built-in views need dynamic predicates ("today" moves), so they carry a preset marker. */
export type ViewPreset = 'inbox' | 'today' | 'all' | 'trash'

export interface ViewFilter {
  tagIds: Id[]
  tagMode: TagMatchMode
  projectIds: Id[]
  statuses: TaskStatus[]
  hasTime: HasTime
  text: string
  excludeTagIds?: Id[]
  dueFrom?: string
  dueTo?: string
  projectMode?: 'any' | 'none'
}

export interface ViewPanel {
  presentation?: 'list' | 'gallery'
  id: Id
  name: string
  emoji: string
  filter: ViewFilter
  sort: ViewSort
  span: number
}

export interface TimeEntry extends Entity {
  taskId: Id | null
  startedAt: IsoDateTime
  endedAt: IsoDateTime
  source: 'timer' | 'manual'
  note: string
  supersededBy?: Id
}

/** Segments are committed on pause/stop; only the active segment remains open. */
export interface TimerSession {
  taskId: Id
  startedAt: IsoDateTime | null
  elapsedSeconds: number
  entryIds: Id[]
  ownerId: string
  lastHeartbeatAt: IsoDateTime
}

export interface View extends Entity {
  presentation: ViewPresentation
  name: string
  emoji?: string
  panels: ViewPanel[]
  icon: string
  builtin: boolean
  preset: ViewPreset | null
  filter: ViewFilter
  arrangement: PanelArrangement
  gridColumns: number
  sort: ViewSort
  sortOrder: number
}

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'
export type LocalePreference = 'system' | 'zh-CN' | 'en' | 'ja'

export interface Settings {
  theme: ThemePreference
  localePreference: LocalePreference
  /** 0 = Sunday, 1 = Monday. */
  weekStartsOn: 0 | 1
  reminderLeadMinutes: number
  notificationsSilent: boolean
  /** Calendar presentation and draggable time-grid scale. */
  calendarMode?: CalendarMode
  calendarHourHeight?: number
  defaultDurationMinutes?: number
}

/** The whole workspace, as persisted and as handed to the UI in one shot. */
export interface Workspace {
  projects: Project[]
  tags: Tag[]
  tasks: Task[]
  taskTags: Record<Id, Id[]>
  views: View[]
  settings: Settings
  timeEntries: TimeEntry[]
  timer: TimerSession | null
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
