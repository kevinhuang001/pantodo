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
          <button type="button" className="secondary" onClick={onCancel}>
            {t('dialog.cancel')}
          </button>
          <button type="button" className="danger-button" onClick={onConfirm}>
            {t(confirmKey)}
          </button>
        </>
      }
    >
      <p>{body}</p>
    </Modal>
  )
}
