import { Button } from './ui/button'
import { t } from '@/i18n'

import { Modal } from './Modal'

interface ConfirmDialogProps {
  title: string
  body: string
  confirmKey?: 'task.action.delete' | 'dialog.emptyTrashTitle'
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({
  title,
  body,
  confirmKey = 'task.action.delete',
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button type="button" className="secondary" variant="outline" onClick={onCancel}>
            {t('dialog.cancel')}
          </Button>
          <Button type="button" className="danger-button" variant="destructive" onClick={onConfirm}>
            {t(confirmKey)}
          </Button>
        </>
      }
    >
      <p>{body}</p>
    </Modal>
  )
}
