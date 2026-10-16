import { ARRANGEMENT_LABEL_KEYS, viewDisplayName } from '@/domain/display'
import { useAppStore } from '@/domain/store'
import type { AppTab, GroupArrangement, View } from '@/domain/types'
import { LOCALES, LOCALE_LABELS, t } from '@/i18n'
import type { Locale, LocalePreference } from '@/i18n'

import { Menu, Segmented } from './Menu'
import type { MenuItemSpec } from './Menu'

interface ToolbarProps {
  tab: AppTab
  view: View | null
  total: number
  doneCount: number
}

const ARRANGEMENTS: GroupArrangement[] = ['vertical', 'columns', 'grid']

/**
 * No layout switcher and no "new task" button: a view is always a list of tasks, its grouping is
 * arranged by dragging, and new tasks are captured in the inbox.
 */
export function Toolbar({ tab, view, total, doneCount }: ToolbarProps) {
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

  const isTimetable = tab === 'timetable'
  const grouped = view !== null && view.groups.length > 0
  const title = isTimetable
    ? t('nav.tab.timetable')
    : view === null
      ? t('views.section')
      : viewDisplayName(view, t)

  return (
    <header className="toolbar">
      <div className="toolbar-title">
        <h1>{title}</h1>
        {isTimetable || view === null ? null : (
          <span className="count">
            {t('count.tasks', { count: total })}
            {total === 0 ? '' : ` · ${t('count.progress', { done: doneCount, total })}`}
          </span>
        )}
      </div>

      <span className="toolbar-spacer" />

      <div className="toolbar-actions">
        {grouped && view !== null ? (
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

        {grouped && view !== null && view.arrangement === 'grid' ? (
          <label className="grid-columns">
            <span className="visually-hidden">{t('view.field.columns')}</span>
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
      </div>
    </header>
  )
}
