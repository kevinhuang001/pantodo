import { useState } from 'react'
import type { FormEvent } from 'react'

import { fromLocalInputValue, toLocalInputValue } from '@/domain/date'
import { paletteFor } from '@/domain/palette'
import { useAppStore } from '@/domain/store'
import type { Task, TaskStatus } from '@/domain/types'
import { TASK_STATUSES } from '@/domain/types'
import { STATUS_LABEL_KEYS } from '@/domain/display'
import { t } from '@/i18n'

import { Modal } from './Modal'

interface TaskDialogProps {
  task: Task | null
  onClose: () => void
}

export function TaskDialog({ task, onClose }: TaskDialogProps) {
  const projects = useAppStore((state) => state.projects).filter(
    (project) => project.deletedAt === null,
  )
  const tags = useAppStore((state) => state.tags).filter((tag) => tag.deletedAt === null)
  const taskTags = useAppStore((state) => state.taskTags)
  const scheduleBlocks = useAppStore((state) => state.scheduleBlocks)
  const settings = useAppStore((state) => state.settings)
  const createTask = useAppStore((state) => state.createTask)
  const updateTask = useAppStore((state) => state.updateTask)
  const setTaskTags = useAppStore((state) => state.setTaskTags)
  const setTaskSchedule = useAppStore((state) => state.setTaskSchedule)

  const existingBlock =
    task === null
      ? null
      : (scheduleBlocks.find((block) => block.taskId === task.id && block.deletedAt === null) ??
        null)

  const [title, setTitle] = useState(task?.title ?? '')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [projectId, setProjectId] = useState(task?.projectId ?? '')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'todo')
  const [due, setDue] = useState(task?.dueAt == null ? '' : toLocalInputValue(task.dueAt))
  const [estimate, setEstimate] = useState(
    task?.estimateMinutes == null ? '' : String(task.estimateMinutes),
  )
  const [tagIds, setTagIds] = useState<string[]>(task === null ? [] : (taskTags[task.id] ?? []))
  const [scheduled, setScheduled] = useState(existingBlock !== null)
  const [start, setStart] = useState(
    existingBlock === null ? '' : toLocalInputValue(existingBlock.startAt),
  )
  const [end, setEnd] = useState(
    existingBlock === null ? '' : toLocalInputValue(existingBlock.endAt),
  )

  const palette = paletteFor(settings.theme === 'dark' ? 'dark' : 'light')

  function toggleTag(id: string): void {
    setTagIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    )
  }

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()
    const trimmed = title.trim()
    if (trimmed === '') return
    const block =
      scheduled && start !== '' && end !== ''
        ? { startAt: fromLocalInputValue(start), endAt: fromLocalInputValue(end) }
        : null
    const patches = {
      title: trimmed,
      notes,
      projectId: projectId === '' ? null : projectId,
      status,
      dueAt: due === '' ? null : fromLocalInputValue(due),
      estimateMinutes: estimate === '' ? null : Number(estimate),
    }

    if (task === null) {
      await createTask({ ...patches, tagIds, block })
    } else {
      await updateTask(task.id, patches)
      await setTaskTags(task.id, tagIds)
      await setTaskSchedule(task.id, block)
    }
    onClose()
  }

  return (
    <Modal
      title={task === null ? t('dialog.newTask') : t('dialog.editTask')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="secondary" onClick={onClose}>
            {t('dialog.cancel')}
          </button>
          <button type="submit" form="pantodo-task-form" className="primary">
            {task === null ? t('dialog.create') : t('dialog.save')}
          </button>
        </>
      }
    >
      <form id="pantodo-task-form" className="stack" onSubmit={(event) => void submit(event)}>
        <div className="field">
          <label htmlFor="task-title">{t('task.field.title')}</label>
          <input
            id="task-title"
            className="input"
            value={title}
            autoFocus
            placeholder={t('task.placeholder.title')}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="task-notes">{t('task.field.notes')}</label>
          <textarea
            id="task-notes"
            className="textarea"
            value={notes}
            placeholder={t('task.placeholder.notes')}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>

        <div className="form-row">
          <div className="field">
            <label htmlFor="task-project">{t('task.field.project')}</label>
            <select
              id="task-project"
              className="select"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
            >
              <option value="">{t('task.field.none')}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="task-status">{t('task.field.status')}</label>
            <select
              id="task-status"
              className="select"
              value={status}
              onChange={(event) => setStatus(event.target.value as TaskStatus)}
            >
              {TASK_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {t(STATUS_LABEL_KEYS[value])}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label htmlFor="task-due">{t('task.field.due')}</label>
            <input
              id="task-due"
              type="datetime-local"
              className="input"
              value={due}
              onChange={(event) => setDue(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="task-estimate">{t('task.field.estimate')}</label>
            <input
              id="task-estimate"
              type="number"
              min={0}
              step={5}
              className="input"
              value={estimate}
              onChange={(event) => setEstimate(event.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label>{t('task.field.tags')}</label>
          <div className="chip-row">
            {tags.length === 0 ? (
              <span className="sidebar-empty">{t('nav.noTags')}</span>
            ) : (
              tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className={
                    tagIds.includes(tag.id) ? 'chip selectable selected' : 'chip selectable'
                  }
                  aria-pressed={tagIds.includes(tag.id)}
                  onClick={() => toggleTag(tag.id)}
                >
                  <span
                    className="dot"
                    style={{ background: tag.color ?? palette[tag.sortOrder % palette.length] }}
                  />
                  {tag.name}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="field">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={scheduled}
              onChange={(event) => setScheduled(event.target.checked)}
            />
            {t('view.layout.timetable')}
          </label>
          {scheduled ? (
            <div className="form-row">
              <input
                type="datetime-local"
                className="input"
                aria-label={t('task.field.due')}
                value={start}
                onChange={(event) => setStart(event.target.value)}
              />
              <input
                type="datetime-local"
                className="input"
                aria-label={t('task.field.due')}
                value={end}
                onChange={(event) => setEnd(event.target.value)}
              />
            </div>
          ) : null}
        </div>
      </form>
    </Modal>
  )
}
