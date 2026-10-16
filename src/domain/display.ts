import type { MessageKey, TFunction } from '@/i18n'

import type { Tag, View, ViewGroup } from './types'

/** Built-in views are re-localised on language switch; user views keep the name they were given. */
export function viewNameKey(view: View): MessageKey | null {
  if (!view.builtin) return null
  switch (view.preset) {
    case 'inbox':
      return 'nav.inbox'
    case 'today':
      return 'nav.today'
    case 'upcoming':
      return 'nav.upcoming'
    case 'all':
      return 'nav.all'
    case 'trash':
      return 'nav.trash'
    default:
      return view.layout === 'quadrant' ? 'nav.quadrant' : null
  }
}

export function viewDisplayName(view: View, t: TFunction): string {
  const key = viewNameKey(view)
  return key === null ? view.name : t(key)
}

export function groupDisplayLabel(group: ViewGroup, t: TFunction): string {
  return group.label === '' ? t('group.uncategorized') : group.label
}

export function groupTagNames(group: ViewGroup, tags: readonly Tag[]): string {
  const byId = new Map(tags.map((tag) => [tag.id, tag]))
  const included = group.rule.tagIds
    .map((id) => byId.get(id)?.name)
    .filter((name): name is string => Boolean(name))
  const excluded = group.rule.excludeTagIds
    .map((id) => byId.get(id)?.name)
    .filter((name): name is string => Boolean(name))
    .map((name) => `−${name}`)
  return [...included, ...excluded].join(' + ')
}

export const LAYOUT_LABEL_KEYS = {
  list: 'view.layout.list',
  board: 'view.layout.board',
  quadrant: 'view.layout.quadrant',
  timetable: 'view.layout.timetable',
} as const satisfies Record<View['layout'], MessageKey>

export const ARRANGEMENT_LABEL_KEYS = {
  vertical: 'toolbar.arrange.vertical',
  columns: 'toolbar.arrange.columns',
  grid: 'toolbar.arrange.grid',
} as const

export const STATUS_LABEL_KEYS = {
  todo: 'task.status.todo',
  doing: 'task.status.doing',
  done: 'task.status.done',
  cancelled: 'task.status.cancelled',
} as const
