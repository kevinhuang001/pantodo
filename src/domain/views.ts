import { t } from '@/i18n'
import { newId } from './ids'
import { EMPTY_FILTER } from './types'
import type { View, ViewPanel } from './types'

export function newPanel(name = t('panel.new')): ViewPanel {
  return {
    id: newId(),
    name,
    emoji: '📌',
    span: 1,
    sort: 'manual',
    filter: { ...EMPTY_FILTER, tagIds: [], projectIds: [], statuses: ['todo', 'doing'] },
  }
}
export function workbenchPanels(): ViewPanel[] {
  return [
    {
      ...newPanel(t('panels.focus')),
      emoji: '🌿',
      filter: { ...EMPTY_FILTER, statuses: ['doing'] },
    },
    {
      ...newPanel(t('panels.life')),
      emoji: '☕',
      filter: { ...EMPTY_FILTER, statuses: ['todo'], projectMode: 'none' },
    },
    { ...newPanel(t('panels.done')), emoji: '✨', filter: { ...EMPTY_FILTER, statuses: ['done'] } },
  ]
}
/** Read persisted views into the current layout model; keep only active fields. */
export function viewWithDefaults(view: View): View {
  return {
    id: view.id,
    createdAt: view.createdAt,
    updatedAt: view.updatedAt,
    deletedAt: view.deletedAt,
    name: view.name,
    emoji: view.emoji,
    icon: view.icon,
    builtin: view.builtin,
    preset: view.preset,
    filter: view.filter,
    sort: view.sort,
    sortOrder: view.sortOrder,
    panels: view.panels ?? [],
    presentation: view.presentation === 'gallery' ? 'gallery' : 'list',
    arrangement: view.arrangement === 'vertical' ? 'vertical' : 'columns',
    columnCount: Number.isInteger(view.columnCount)
      ? Math.max(1, Math.min(4, view.columnCount))
      : 2,
  }
}
