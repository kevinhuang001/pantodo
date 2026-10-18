import { localDate } from '@/domain/recurrence'
import { getLocale } from '@/i18n'
import { RepeatDeleteDialog } from './RepeatDeleteDialog'
import { RecurrenceFields } from './RecurrenceFields'
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
import type { Task } from '@/domain/types'
import { t } from '@/i18n'
import type { MessageKey } from '@/i18n'
import { Modal } from './Modal'
import { ScheduleFields } from './ScheduleFields'
import type { ScheduleValues } from '@/domain/planning'

export function TaskDialog({
  task: selectedTask,
  onClose,
}: {
  task: Task | null
  onClose: () => void
}) {
  const persistedTask = useAppStore((state) => state.tasks.find((t) => t.id === selectedTask?.id))
  const task = persistedTask ?? selectedTask
  const [recurrence, setRecurrence] = useState(task?.recurrence ?? null)
  const occurrenceKey = selectedTask?.occurrenceKey
  const [deleting, setDeleting] = useState(false)
  const projects = useAppStore((state) => state.projects).filter((item) => !item.deletedAt)
  const tags = useAppStore((state) => state.tags).filter((item) => !item.deletedAt)
  const taskTags = useAppStore((state) => state.taskTags)
  const [title, setTitle] = useState(task?.title ?? '')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const status =
    occurrenceKey && (task?.recurrence || task?.occurrences)
      ? (task.occurrences?.[occurrenceKey]?.status ?? 'todo')
      : (task?.status ?? 'todo')
  const [projectId, setProjectId] = useState(task?.projectId ?? '')
  const [tagIds, setTagIds] = useState(task ? (taskTags[task.id] ?? []) : [])
  const local = (value: string | null | undefined) => (value ? toLocalInputValue(value) : '')
  const [time, setTime] = useState<ScheduleValues>({
    start: local(task?.startAt),
    end: local(task?.endAt),
    due: local(task?.dueAt),
    estimate:
      task?.estimateMinutes == null
        ? String(useAppStore.getState().settings.defaultPlanMinutes ?? 30)
        : String(task.estimateMinutes),
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
        recurrence,
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
        error instanceof Error &&
          ['time.invalidRange', 'task.invalidTitle', 'repeat.invalid'].includes(error.message)
          ? t(error.message as MessageKey)
          : t('work.failed'),
      )
    } finally {
      setSaving(false)
    }
  }
  if (deleting && selectedTask)
    return (
      <RepeatDeleteDialog
        task={selectedTask}
        onClose={onClose}
        onCancel={() => setDeleting(false)}
      />
    )
  return (
    <Modal
      className="task-editor modern-editor"
      title={task ? t('dialog.editTask') : t('dialog.newTask')}
      onClose={onClose}
      footer={
        <>
          {task?.recurrence || task?.occurrences ? (
            <Button
              className="danger-button"
              variant="destructive"
              disabled={saving}
              onClick={() => setDeleting(!deleting)}
            >
              {t('task.action.delete')}
            </Button>
          ) : null}
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
      <form
        id="pantodo-task-form"
        className="task-editor-grid"
        onSubmit={(event) => void submit(event)}
      >
        {occurrenceKey ? (
          <div className="occurrence-banner">
            {t('repeat.occurrence', {
              date: new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium' }).format(
                localDate(occurrenceKey),
              ),
            })}
          </div>
        ) : null}
        <div className="editor-main stack">
          <div className="field editor-title-field">
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
              className="textarea editor-notes"
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
              <output id="task-status" className="editor-status" data-status={status}>
                <span className="dot" />
                {t(STATUS_LABEL_KEYS[status])}
              </output>
            </div>
          </div>
          <div className="field">
            <label>{t('task.field.tags')}</label>
            <div className="chip-row">
              {tags.map((tag) => (
                <button
                  className={
                    tagIds.includes(tag.id) ? 'chip selectable selected' : 'chip selectable'
                  }
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
        </div>
        <aside className="editor-aside">
          <ScheduleFields
            value={time}
            onChange={setTime}
            legend={occurrenceKey ? t('repeat.template') : undefined}
          />
          <div className="editor-repeat">
            <RecurrenceFields
              source={task ?? undefined}
              selectedDate={occurrenceKey}
              value={recurrence}
              onChange={setRecurrence}
              start={time.start || time.due}
            />
            <p className="field-hint">{t('repeat.seriesHint')}</p>
          </div>
        </aside>
        {error ? (
          <p role="alert" className="form-error">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  )
}
