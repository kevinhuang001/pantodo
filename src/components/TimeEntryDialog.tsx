import { useState } from 'react'
import { subMinutes } from 'date-fns'
import { fromLocalInputValue, toLocalInputValue } from '@/domain/date'
import { newId } from '@/domain/ids'
import { overlaps } from '@/domain/time'
import { useAppStore } from '@/domain/store'
import type { TimeEntry } from '@/domain/types'
import { t } from '@/i18n'
import type { MessageKey } from '@/i18n'
import { Modal } from './Modal'
export function TimeEntryDialog({
  entry,
  onClose,
}: {
  entry: TimeEntry | null
  onClose: () => void
}) {
  const tasks = useAppStore((state) => state.tasks).filter((task) => !task.deletedAt)
  const entries = useAppStore((state) => state.timeEntries)
  const timer = useAppStore((state) => state.timer)
  const command = useAppStore((state) => state.timeCommand)
  const [taskId, setTaskId] = useState(entry?.taskId ?? '')
  const [start, setStart] = useState(() =>
    toLocalInputValue(entry?.startedAt ?? subMinutes(new Date(), 30).toISOString()),
  )
  const [end, setEnd] = useState(() =>
    toLocalInputValue(entry?.endedAt ?? new Date().toISOString()),
  )
  const [note, setNote] = useState(entry?.note ?? '')
  const [error, setError] = useState('')
  const range = {
    startedAt: new Date(start).toString() === 'Invalid Date' ? '' : new Date(start).toISOString(),
    endedAt: new Date(end).toString() === 'Invalid Date' ? '' : new Date(end).toISOString(),
  }
  const conflicts =
    entries.filter((item) => !item.deletedAt && item.id !== entry?.id && overlaps(item, range))
      .length +
    (timer?.startedAt &&
    overlaps({ startedAt: timer.startedAt, endedAt: new Date().toISOString() }, range)
      ? 1
      : 0)
  return (
    <Modal
      title={entry ? t('work.edit') : t('work.manual')}
      onClose={onClose}
      footer={
        <>
          <button className="secondary" onClick={onClose}>
            {t('dialog.cancel')}
          </button>
          <button className="primary" type="submit" form="time-entry-form">
            {t('dialog.save')}
          </button>
        </>
      }
    >
      <form
        id="time-entry-form"
        className="stack"
        onSubmit={(event) => {
          event.preventDefault()
          setError('')
          try {
            const stamp = new Date().toISOString()
            command({
              kind: 'save',
              entry: {
                id: entry?.id ?? newId(),
                taskId: taskId || null,
                startedAt: fromLocalInputValue(start),
                endedAt: fromLocalInputValue(end),
                source: 'manual',
                note,
                createdAt: entry?.createdAt ?? stamp,
                updatedAt: stamp,
                deletedAt: null,
              },
            })
            onClose()
          } catch (failure) {
            const message = failure instanceof Error ? failure.message : ''
            setError(
              ['time.invalidRange', 'time.future', 'time.unavailableTask'].includes(message)
                ? t(message as MessageKey)
                : t('work.failed'),
            )
          }
        }}
      >
        <div className="field">
          <label htmlFor="entry-task">Todo</label>
          <select
            id="entry-task"
            className="select"
            value={taskId}
            onChange={(event) => setTaskId(event.target.value)}
          >
            <option value="">{t('work.free')}</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="entry-start">{t('plan.start')}</label>
            <input
              id="entry-start"
              className="input"
              type="datetime-local"
              value={start}
              required
              onChange={(event) => setStart(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="entry-end">{t('plan.end')}</label>
            <input
              id="entry-end"
              className="input"
              type="datetime-local"
              value={end}
              required
              min={start}
              onChange={(event) => setEnd(event.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="entry-note">{t('work.note')}</label>
          <textarea
            id="entry-note"
            className="textarea"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        <p className={conflicts ? 'overwrite-note' : 'field-hint'}>
          {t('work.overwrite')}
          {conflicts ? ' (' + conflicts + ')' : ''}
        </p>
        {error ? (
          <p role="alert" className="form-error">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  )
}
