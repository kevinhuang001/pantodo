import type { MessageKey } from '@/i18n'
import { getLocale, t } from '@/i18n'
import { formatDateTime, formatMinutes } from '@/domain/date'
import { colorFor, dueState } from '@/domain/filters'
import type { Id, Project, Tag, Task } from '@/domain/types'

import { useAppStore } from '@/domain/store'
import { Icon } from './Icon'

/** Everything a row needs, built once per render by the shell. */
export interface TaskLookup {
  projectsById: Map<Id, Project>
  tagsOfTask: (taskId: Id) => Tag[]
  now: Date
  palette: readonly string[]
  selectedTaskId: Id | null
  onSelect: (task: Task) => void
  onToggleComplete: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onRestore: (task: Task) => void
}

function checkClass(status: Task['status']): string {
  if (status === 'done') return 'task-check done'
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
        role="checkbox"
        aria-checked={task.status === 'done'}
        aria-label={checkLabel(task.status)}
        onClick={() => lookup.onToggleComplete(task)}
      >
        {task.status === 'done' ? <Icon name="check" size={11} /> : null}
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
              <span className="project-emoji" aria-hidden="true">
                {project.emoji || '📁'}
              </span>
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

      <div
        className="task-timing"
        data-empty={!task.startAt && !task.dueAt && task.estimateMinutes === null}
      >
        {task.startAt ? (
          <span className="task-plan">
            <Icon name="calendar" size={12} />
            {formatDateTime(task.startAt, locale)}
          </span>
        ) : null}
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
      {task.deletedAt === null && task.status !== 'done' && task.status !== 'cancelled' ? (
        <TaskTimerButton task={task} />
      ) : null}
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

function TaskTimerButton({ task }: { task: Task }) {
  const timer = useAppStore((state) => state.timer)
  const command = useAppStore((state) => state.timeCommand)
  const active = timer?.taskId === task.id
  const running = active && !!timer?.startedAt
  return (
    <button
      type="button"
      className={active ? 'task-start active' : 'task-start'}
      aria-label={running ? t('work.pause') : active ? t('work.resume') : t('work.start')}
      title={running ? t('work.pause') : active ? t('work.resume') : t('work.start')}
      onClick={() =>
        command(
          running
            ? { kind: 'pause' }
            : active
              ? { kind: 'resume' }
              : { kind: 'start', taskId: task.id },
        )
      }
    >
      <Icon name={running ? 'pause' : 'play'} size={12} />
    </button>
  )
}

export function TaskList({
  tasks,
  lookup,
  emptyKey,
  presentation = 'list',
}: {
  tasks: Task[]
  lookup: TaskLookup
  presentation?: 'list' | 'gallery'
  emptyKey?: MessageKey
}) {
  if (tasks.length === 0) {
    return emptyKey === undefined ? null : <p className="group-empty">{t(emptyKey)}</p>
  }
  return (
    <div
      className={presentation === 'gallery' ? 'task-list task-gallery' : 'task-list'}
      data-presentation={presentation}
    >
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} lookup={lookup} />
      ))}
    </div>
  )
}
