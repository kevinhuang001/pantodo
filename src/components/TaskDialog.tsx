import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { SelectField } from './SelectField'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { fromLocalInputValue, toLocalInputValue } from '@/domain/date'
import { validatePlan } from '@/domain/calendar'
import { useAppStore } from '@/domain/store'
import { STATUS_LABEL_KEYS } from '@/domain/display'
import { TASK_STATUSES } from '@/domain/types'
import type { Task, TaskStatus } from '@/domain/types'
import { t } from '@/i18n'
import type { MessageKey } from '@/i18n'
import { Modal } from './Modal'
import { ScheduleFields } from './ScheduleFields'
import type { ScheduleValues } from '@/domain/planning'

export function TaskDialog({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const projects = useAppStore((state) => state.projects).filter((item) => !item.deletedAt)
  const tags = useAppStore((state) => state.tags).filter((item) => !item.deletedAt)
  const taskTags = useAppStore((state) => state.taskTags)
  const [title, setTitle] = useState(task?.title ?? '')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'todo')
  const [projectId, setProjectId] = useState(task?.projectId ?? '')
  const [tagIds, setTagIds] = useState(task ? (taskTags[task.id] ?? []) : [])
  const local = (value: string | null | undefined) => (value ? toLocalInputValue(value) : '')
  const [time, setTime] = useState<ScheduleValues>({
    start: local(task?.startAt),
    end: local(task?.endAt),
    due: local(task?.dueAt),
    estimate: task?.estimateMinutes == null ? '' : String(task.estimateMinutes),
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (!title.trim()) throw new Error('task.invalidTitle')
      const startAt = time.start ? fromLocalInputValue(time.start) : null
      const endAt = time.end ? fromLocalInputValue(time.end) : null
      validatePlan(startAt, endAt)
      const patch = {
        title: title.trim(),
        notes,
        status,
        projectId: projectId || null,
        startAt,
        endAt,
        dueAt: time.due ? fromLocalInputValue(time.due) : null,
        estimateMinutes: time.estimate ? Number(time.estimate) : null,
      }
      const store = useAppStore.getState()
      if (task) {
        await store.updateTask(task.id, patch)
        await store.setTaskTags(task.id, tagIds)
      } else await store.createTask({ ...patch, tagIds })
      onClose()
    } catch (error) {
      setError(
        error instanceof Error && ['time.invalidRange', 'task.invalidTitle'].includes(error.message)
          ? t(error.message as MessageKey)
          : t('work.failed'),
      )
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal
      title={task ? t('dialog.editTask') : t('dialog.newTask')}
      onClose={onClose}
      footer={
        <>
          <Button className="secondary" variant="outline" onClick={onClose}>
            {t('dialog.cancel')}
          </Button>
          <Button
            className="primary"
            variant="default"
            type="submit"
            form="pantodo-task-form"
            disabled={saving}
          >
            {task ? t('dialog.save') : t('dialog.create')}
          </Button>
        </>
      }
    >
      <form id="pantodo-task-form" className="stack" onSubmit={(event) => void submit(event)}>
        <div className="field">
          <label htmlFor="task-title">{t('task.field.title')}</label>
          <Input
            id="task-title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            required
          />
        </div>
        <div className="field">
          <label htmlFor="task-notes">{t('task.field.notes')}</label>
          <Textarea
            id="task-notes"
            className="textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="task-project">{t('task.field.project')}</label>
            <SelectField
              id="task-project"
              className="select"
              value={projectId}
              onValueChange={(e) => setProjectId(e)}
            >
              <option value="">{t('task.field.none')}</option>
              {projects.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.emoji} {p.name}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="field">
            <label htmlFor="task-status">{t('task.field.status')}</label>
            <SelectField
              id="task-status"
              className="select"
              value={status}
              onValueChange={(e) => setStatus(e as TaskStatus)}
            >
              {TASK_STATUSES.map((s) => (
                <option value={s} key={s}>
                  {t(STATUS_LABEL_KEYS[s])}
                </option>
              ))}
            </SelectField>
          </div>
        </div>
        <div className="field">
          <label>{t('task.field.tags')}</label>
          <div className="chip-row">
            {tags.map((tag) => (
              <button
                className={tagIds.includes(tag.id) ? 'chip selectable selected' : 'chip selectable'}
                type="button"
                key={tag.id}
                aria-pressed={tagIds.includes(tag.id)}
                onClick={() =>
                  setTagIds((current) =>
                    current.includes(tag.id)
                      ? current.filter((id) => id !== tag.id)
                      : [...current, tag.id],
                  )
                }
              >
                <span className="dot" style={{ background: tag.color ?? 'var(--accent)' }} />
                {tag.name}
              </button>
            ))}
          </div>
        </div>
        <ScheduleFields value={time} onChange={setTime} />
        {error ? (
          <p role="alert" className="form-error">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  )
}
