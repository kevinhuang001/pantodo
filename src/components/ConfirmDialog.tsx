import { useState } from 'react'
import { Button } from './ui/button'
import { t } from '@/i18n'

import { Modal } from './Modal'

interface ConfirmDialogProps {
  title: string
  body: string
  confirmKey?: 'task.action.delete' | 'dialog.emptyTrashTitle' | 'task.action.complete'
  onCancel: () => void
  onConfirm: () => void | Promise<void>
}

export function ConfirmDialog({
  title,
  body,
  confirmKey = 'task.action.delete',
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const complete = confirmKey === 'task.action.complete'
  const cancel = () => {
    if (!saving) onCancel()
  }
  return (
    <Modal
      title={title}
      onClose={cancel}
      footer={
        <>
          <Button
            type="button"
            className="secondary"
            variant="outline"
            onClick={cancel}
            disabled={saving}
          >
            {t('dialog.cancel')}
          </Button>
          <Button
            type="button"
            className={complete ? 'primary' : 'danger-button'}
            variant={complete ? 'default' : 'destructive'}
            disabled={saving}
            onClick={() => {
              if (saving) return
              setSaving(true)
              setFailed(false)
              void Promise.resolve()
                .then(onConfirm)
                .catch(() => setFailed(true))
                .finally(() => setSaving(false))
            }}
          >
            {t(confirmKey)}
          </Button>
        </>
      }
    >
      <p>{body}</p>
      {failed ? (
        <p role="alert" className="form-error">
          {t('work.failed')}
        </p>
      ) : null}
    </Modal>
  )
}
