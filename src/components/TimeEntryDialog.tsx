import { Button } from './ui/button'
import { SelectField } from './SelectField'
import { DateTimeField } from './DateTimeField'
import { Textarea } from './ui/textarea'
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
          <Button className="secondary" variant="outline" onClick={onClose}>
            {t('dialog.cancel')}
          </Button>
          <Button className="primary" variant="default" type="submit" form="time-entry-form">
            {t('dialog.save')}
          </Button>
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
          <SelectField
            id="entry-task"
            className="select"
            value={taskId}
            onValueChange={(event) => setTaskId(event)}
          >
            <option value="">{t('work.free')}</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="entry-start">{t('plan.start')}</label>
            <DateTimeField
              id="entry-start"

              value={start}
              onChange={(next) => setStart(next)}
            />
          </div>
          <div className="field">
            <label htmlFor="entry-end">{t('plan.end')}</label>
            <DateTimeField
              id="entry-end"

              value={end}
              min={start}
              onChange={(next) => setEnd(next)}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="entry-note">{t('work.note')}</label>
          <Textarea
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
