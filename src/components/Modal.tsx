import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'

import { t } from '@/i18n'

import { Icon } from './Icon'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

/**
 * A native `<dialog>` host, matching the reference project: one modal element, blurred backdrop and
 * a right-aligned action row.
 */
export function Modal({ title, onClose, children, footer }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (dialog !== null && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
    >
      <div className="dialog-header">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label={t('dialog.close')}
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="dialog-body">{children}</div>
      {footer === undefined ? null : <div className="dialog-actions">{footer}</div>}
    </dialog>
  )
}
