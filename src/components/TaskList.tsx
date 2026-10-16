import type { MessageKey } from '@/i18n'
import { getLocale, t } from '@/i18n'
import { formatDateTime, formatMinutes } from '@/domain/date'
import { colorFor, dueState } from '@/domain/filters'
import type { Id, Project, Tag, Task } from '@/domain/types'

import { Icon } from './Icon'

/** Everything a row needs, built once per render by the shell. */
export interface TaskLookup {
  projectsById: Map<Id, Project>
  tagsOfTask: (taskId: Id) => Tag[]
  now: Date
  palette: readonly string[]
  selectedTaskId: Id | null
  onSelect: (task: Task) => void
  onCycleStatus: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onRestore: (task: Task) => void
}

function checkClass(status: Task['status']): string {
  if (status === 'done') return 'task-check done'
  if (status === 'doing') return 'task-check doing'
  return 'task-check'
}

function checkLabel(status: Task['status']): string {
  return status === 'done' ? t('task.action.reopen') : t('task.action.complete')
}

export function TaskRow({ task, lookup }: { task: Task; lookup: TaskLookup }) {
  const project = task.projectId === null ? null : (lookup.projectsById.get(task.projectId) ?? null)
  const tags = lookup.tagsOfTask(task.id)
  const state = task.dueAt === null ? null : dueState(task, lookup.now)
  const locale = getLocale()

  return (
    <div
      className={[
        'task-row',
        task.status === 'done' ? 'done' : '',
        lookup.selectedTaskId === task.id ? 'selected' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-task-id={task.id}
    >
      <button
        type="button"
        className={checkClass(task.status)}
        aria-label={checkLabel(task.status)}
        onClick={() => lookup.onCycleStatus(task)}
      >
        {task.status === 'done' ? <Icon name="check" size={11} /> : null}
        {task.status === 'doing' ? <Icon name="play" size={9} /> : null}
      </button>

      <div
        className="task-body"
        role="button"
        tabIndex={0}
        onClick={() => lookup.onSelect(task)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            lookup.onSelect(task)
          }
        }}
      >
        <span className="task-title">{task.title}</span>
        {task.notes ? <span className="task-description">{task.notes}</span> : null}
        <span className="task-meta">
          {project === null ? null : (
            <span className="chip">
              <span className="dot" style={{ background: colorFor(project, lookup.palette) }} />
              {project.name}
            </span>
          )}
          {tags.map((tag) => (
            <span className="chip" key={tag.id}>
              <span className="dot" style={{ background: colorFor(tag, lookup.palette) }} />
              {tag.name}
            </span>
          ))}
        </span>
      </div>

      <div className="task-timing">
        {task.dueAt === null ? (
          <span className="task-unscheduled">—</span>
        ) : (
          <span className={state === 'overdue' ? 'task-due overdue' : 'task-due'}>
            <Icon name="calendar" size={13} />
            {formatDateTime(task.dueAt, locale)}
          </span>
        )}
        {task.estimateMinutes === null ? null : (
          <span className="task-estimate">
            <Icon name="clock" size={11} />
            {formatMinutes(task.estimateMinutes)}
          </span>
        )}
      </div>
      <div className="task-actions">
        {task.deletedAt === null ? null : (
          <button
            type="button"
            className="icon-button"
            aria-label={t('task.action.restore')}
            title={t('task.action.restore')}
            onClick={() => lookup.onRestore(task)}
          >
            <Icon name="restore" />
          </button>
        )}
        <button
          type="button"
          className="icon-button"
          aria-label={t('task.action.edit')}
          title={t('task.action.edit')}
          onClick={() => lookup.onEdit(task)}
        >
          <Icon name="pencil" />
        </button>
        {task.deletedAt === null ? (
          <button
            type="button"
            className="icon-button"
            aria-label={t('task.action.delete')}
            title={t('task.action.delete')}
            onClick={() => lookup.onDelete(task)}
          >
            <Icon name="trash" />
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function TaskList({
  tasks,
  lookup,
  emptyKey,
}: {
  tasks: Task[]
  lookup: TaskLookup
  emptyKey?: MessageKey
}) {
  if (tasks.length === 0) {
    return emptyKey === undefined ? null : <p className="group-empty">{t(emptyKey)}</p>
  }
  return (
    <div className="task-list">
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} lookup={lookup} />
      ))}
    </div>
  )
}
