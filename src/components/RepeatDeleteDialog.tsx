import { useState } from 'react'
import type { Task } from '@/domain/types'
import { useAppStore } from '@/domain/store'
import { t } from '@/i18n'
import { Modal } from './Modal'
import { Button } from './ui/button'

export function RepeatDeleteDialog({
  task,
  onClose,
  onCancel = onClose,
}: {
  task: Task
  onClose: () => void
  onCancel?: () => void
}) {
  const [busy, setBusy] = useState(false),
    [failed, setFailed] = useState(false)
  const remove = async (one: boolean) => {
    setBusy(true)
    setFailed(false)
    try {
      const state = useAppStore.getState()
      if (one && task.occurrenceKey) await state.skipOccurrence(task.id, task.occurrenceKey)
      else await state.softDeleteTask(task.id)
      onClose()
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      title={t('dialog.deleteTitle')}
      onClose={() => {
        if (!busy) onCancel()
      }}
      footer={
        <Button variant="outline" className="secondary" disabled={busy} onClick={onCancel}>
          {t('dialog.cancel')}
        </Button>
      }
    >
      <p>{t('repeat.deleteHint')}</p>
      <div className="repeat-delete-options">
        {task.occurrenceKey ? (
          <Button
            className="secondary"
            variant="outline"
            disabled={busy}
            onClick={() => void remove(true)}
          >
            {t('repeat.deleteOne')}
          </Button>
        ) : null}
        <Button
          className="danger-button"
          variant="destructive"
          disabled={busy}
          onClick={() => void remove(false)}
        >
          {t('repeat.deleteAll')}
        </Button>
      </div>
      {failed ? (
        <p role="alert" className="form-error">
          {t('work.failed')}
        </p>
      ) : null}
    </Modal>
  )
}
