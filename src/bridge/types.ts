import type {
  Id,
  Project,
  ScheduleBlock,
  Settings,
  Tag,
  Task,
  View,
  Workspace,
} from '@/domain/types'

/**
 * Persistence port.
 *
 * The method surface is deliberately granular so that it maps one-to-one onto the Tauri IPC commands
 * the Rust core will expose in M2 (`list_*` / `upsert_*` / `set_task_tags` / …). Swapping the browser
 * fixture for the Rust core therefore does not touch the store or the UI.
 *
 * Deletes are soft: callers set `deletedAt` and upsert. `purgeTasks` is the only destructive call and
 * exists for "empty trash".
 */
export interface Bridge {
  readonly kind: 'browser' | 'tauri'
  load(): Promise<Workspace>
  reset(): Promise<Workspace>

  upsertProject(project: Project): Promise<void>
  upsertTag(tag: Tag): Promise<void>
  upsertTask(task: Task): Promise<void>
  upsertView(view: View): Promise<void>

  setTaskTags(taskId: Id, tagIds: Id[]): Promise<void>
  upsertScheduleBlock(block: ScheduleBlock): Promise<void>
  removeScheduleBlock(id: Id): Promise<void>

  saveSettings(settings: Settings): Promise<void>
  purgeTasks(ids: Id[]): Promise<void>
}
