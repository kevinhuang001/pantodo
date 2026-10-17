import type { MessageKey, TFunction } from '@/i18n'

import type { View } from './types'

/** Built-in views are re-localised on language switch; user views keep the name they were given. */
export function viewNameKey(view: View): MessageKey | null {
  if (!view.builtin) return null
  switch (view.preset) {
    case 'inbox':
      return 'nav.inbox'
    case 'today':
      return 'nav.today'
    case 'all':
      return 'nav.all'
    case 'trash':
      return 'nav.trash'
    default:
      return null
  }
}

export function viewDisplayName(view: View, t: TFunction): string {
  const key = viewNameKey(view)
  return key === null ? view.name : t(key)
}

export const ARRANGEMENT_LABEL_KEYS = {
  vertical: 'toolbar.arrange.vertical',
  columns: 'toolbar.arrange.columns',
} as const

export const STATUS_LABEL_KEYS = {
  todo: 'task.status.todo',
  doing: 'task.status.doing',
  done: 'task.status.done',
  cancelled: 'task.status.cancelled',
} as const
