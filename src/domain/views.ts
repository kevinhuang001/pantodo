import { t } from '@/i18n'
import { newId } from './ids'
import { EMPTY_FILTER } from './types'
import type { ViewPanel } from './types'

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
