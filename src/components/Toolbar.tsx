import { ARRANGEMENT_LABEL_KEYS, LAYOUT_LABEL_KEYS, viewDisplayName } from '@/domain/display'
import { useAppStore } from '@/domain/store'
import type { GroupArrangement, View, ViewLayout } from '@/domain/types'
import { LOCALES, LOCALE_LABELS, t } from '@/i18n'
import type { Locale, LocalePreference } from '@/i18n'

import { Icon } from './Icon'
import { Menu, Segmented } from './Menu'
import type { MenuItemSpec } from './Menu'

interface ToolbarProps {
  view: View
  total: number
  doneCount: number
  onNewTask: () => void
  onOpenSettings: () => void
}

const LAYOUTS: ViewLayout[] = ['list', 'board', 'quadrant', 'timetable']
const ARRANGEMENTS: GroupArrangement[] = ['vertical', 'columns', 'grid']

export function Toolbar({ view, total, doneCount, onNewTask, onOpenSettings }: ToolbarProps) {
  const settings = useAppStore((state) => state.settings)
  const updateView = useAppStore((state) => state.updateView)
  const updateSettings = useAppStore((state) => state.updateSettings)

  const themeItems: MenuItemSpec[] = [
    {
      key: 'system',
      label: t('theme.system'),
      icon: 'monitor',
      selected: settings.theme === 'system',
      onSelect: () => void updateSettings({ theme: 'system' }),
    },
    {
      key: 'light',
      label: t('theme.light'),
      icon: 'sun',
      selected: settings.theme === 'light',
      onSelect: () => void updateSettings({ theme: 'light' }),
    },
    {
      key: 'dark',
      label: t('theme.dark'),
      icon: 'moon',
      selected: settings.theme === 'dark',
      onSelect: () => void updateSettings({ theme: 'dark' }),
    },
  ]

  const languageItems: MenuItemSpec[] = [
    {
      key: 'system',
      label: t('language.system'),
      icon: 'monitor',
      selected: settings.localePreference === 'system',
      onSelect: () => void updateSettings({ localePreference: 'system' }),
    },
    ...LOCALES.map<MenuItemSpec>((locale: Locale) => ({
      key: locale,
      label: LOCALE_LABELS[locale],
      selected: settings.localePreference === (locale as LocalePreference),
      onSelect: () => void updateSettings({ localePreference: locale }),
    })),
  ]

  const grouped = view.layout === 'board' || view.layout === 'quadrant'

  return (
    <header className="toolbar">
      <div className="toolbar-title">
        <h1>{viewDisplayName(view, t)}</h1>
        <span className="count">
          {t('count.tasks', { count: total })}
          {total === 0 ? '' : ` · ${t('count.progress', { done: doneCount, total })}`}
        </span>
      </div>

      <span className="toolbar-spacer" />

      <div className="toolbar-actions">
        <Segmented
          label={t('toolbar.layout')}
          value={view.layout}
          options={LAYOUTS.map((layout) => ({
            key: layout,
            label: t(LAYOUT_LABEL_KEYS[layout]),
            icon: layout === 'list' ? 'list' : layout === 'timetable' ? 'calendar' : 'grid',
          }))}
          onChange={(key) => void updateView(view.id, { layout: key as ViewLayout })}
        />

        {grouped ? (
          <Segmented
            label={t('toolbar.arrangement')}
            value={view.arrangement}
            options={ARRANGEMENTS.map((arrangement) => ({
              key: arrangement,
              label: t(ARRANGEMENT_LABEL_KEYS[arrangement]),
            }))}
            onChange={(key) => void updateView(view.id, { arrangement: key as GroupArrangement })}
          />
        ) : null}

        {grouped && view.arrangement === 'grid' ? (
          <label className="grid-columns">
            <span className="visually-hidden">{t('toolbar.arrangement')}</span>
            <select
              className="select"
              value={view.gridColumns}
              onChange={(event) =>
                void updateView(view.id, { gridColumns: Number(event.target.value) })
              }
            >
              {[1, 2, 3, 4].map((columns) => (
                <option key={columns} value={columns}>
                  {columns} ×
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <Menu label={t('toolbar.theme')} icon="sun" items={themeItems} />
        <Menu label={t('toolbar.language')} icon="globe" items={languageItems} />

        <button
          type="button"
          className="icon-button"
          title={t('toolbar.settings')}
          aria-label={t('toolbar.settings')}
          onClick={onOpenSettings}
        >
          <Icon name="settings" />
        </button>

        <button type="button" className="primary" onClick={onNewTask}>
          <Icon name="plus" />
          {t('toolbar.newTask')}
        </button>
      </div>
    </header>
  )
}
