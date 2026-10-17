import type { SyncData } from '@/sync/model'
import type { TimeCommand, TimeState } from '@/domain/time'
import type { Id, Project, Settings, Tag, Task, View, Workspace } from '@/domain/types'

/** Persistence port; each time transition is persisted atomically. */
export interface Bridge {
  readonly kind: 'browser' | 'tauri'
  readonly ownerId: string
  load(): Promise<Workspace>
  loadSync(): Workspace
  applySync(data: SyncData, previous: SyncData): Promise<void>
  upsertProject(project: Project): Promise<void>
  upsertTag(tag: Tag): Promise<void>
  upsertTask(task: Task): Promise<void>
  upsertView(view: View): Promise<void>
  setTaskTags(taskId: Id, tagIds: Id[]): Promise<void>
  timeCommand(command: TimeCommand): TimeState
  saveSettings(settings: Settings): Promise<void>
  purgeTasks(ids: Id[]): Promise<void>
}
