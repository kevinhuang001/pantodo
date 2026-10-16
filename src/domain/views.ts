import { t } from '@/i18n'
import { newId } from './ids'
import { EMPTY_FILTER } from './types'
import type { ViewPanel } from './types'

export function newPanel(name = t('panel.new')): ViewPanel {
  return {
    id: newId(),
    name,
    emoji: '📌',
    color: null,
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
export function quadrantPanels(important: string, urgent: string): ViewPanel[] {
  return [
    {
      ...newPanel(t('quadrant.importantUrgent')),
      emoji: '🔥',
      filter: {
        ...EMPTY_FILTER,
        statuses: ['todo', 'doing'],
        tagIds: [important, urgent],
        tagMode: 'all',
      },
    },
    {
      ...newPanel(t('quadrant.importantOnly')),
      emoji: '🌱',
      filter: {
        ...EMPTY_FILTER,
        statuses: ['todo', 'doing'],
        tagIds: [important],
        excludeTagIds: [urgent],
      },
    },
    {
      ...newPanel(t('quadrant.urgentOnly')),
      emoji: '⚡',
      filter: {
        ...EMPTY_FILTER,
        statuses: ['todo', 'doing'],
        tagIds: [urgent],
        excludeTagIds: [important],
      },
    },
    {
      ...newPanel(t('quadrant.neither')),
      emoji: '☁️',
      filter: { ...EMPTY_FILTER, statuses: ['todo', 'doing'], excludeTagIds: [important, urgent] },
    },
  ]
}
