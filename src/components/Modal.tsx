import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
export function Modal({
  title,
  onClose,
  children,
  footer,
  className,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        className={['dialog product-dialog', className].filter(Boolean).join(' ')}
        aria-describedby={undefined}
      >
        <DialogHeader className="dialog-header">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="dialog-body">{children}</div>
        {footer ? <DialogFooter className="dialog-actions">{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  )
}
