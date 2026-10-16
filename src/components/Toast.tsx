import { useEffect } from 'react'

import { t } from '@/i18n'
import { useAppStore } from '@/domain/store'

const TOAST_MS = 3200

export function Toast() {
  const toast = useAppStore((state) => state.toast)
  const dismiss = useAppStore((state) => state.dismissToast)

  useEffect(() => {
    if (toast === null) return undefined
    const timer = window.setTimeout(dismiss, TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [toast, dismiss])

  return (
    <div className={toast === null ? 'toast' : 'toast show'} role="status" aria-live="polite">
      {toast === null ? '' : t(toast.key)}
    </div>
  )
}
