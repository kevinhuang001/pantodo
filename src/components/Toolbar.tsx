import { ARRANGEMENT_LABEL_KEYS, viewDisplayName } from '@/domain/display'
import { useAppStore } from '@/domain/store'
import type { AppTab, GroupArrangement, View } from '@/domain/types'
import { getLocale, t } from '@/i18n'
import { Segmented } from './Menu'
export function Toolbar({
  tab,
  view,
  total,
  doneCount,
}: {
  tab: AppTab
  view: View | null
  total: number
  doneCount: number
}) {
  const updateView = useAppStore((state) => state.updateView)
  const title =
    tab === 'statistics'
      ? t('nav.statistics')
      : tab === 'timetable'
        ? t('nav.tab.timetable')
        : view
          ? viewDisplayName(view, t)
          : t('views.section')
  const grouped =
    tab === 'views' &&
    view &&
    (view.panels !== undefined || view.groups.length > 0 || view.groupBy !== 'none')
  return (
    <header className="toolbar">
      <div className="toolbar-title">
        <span className="toolbar-breadcrumb">
          {t('ui.workspace')}
          <span>/</span>
        </span>
        <h1>
          {tab === 'views' && view?.emoji ? (
            <span className="title-emoji" aria-hidden="true">
              {view.emoji}{' '}
            </span>
          ) : null}
          {title}
        </h1>
        {tab === 'views' && view?.preset !== 'inbox' ? (
          <span className="count">
            {total} · {doneCount}
          </span>
        ) : null}
      </div>
      <span className="toolbar-spacer" />
      <div className="toolbar-actions">
        <span className="toolbar-date">
          {new Intl.DateTimeFormat(getLocale(), {
            month: 'short',
            day: 'numeric',
            weekday: 'short',
          }).format(new Date())}
        </span>
        {grouped && view ? (
          <>
            <Segmented
              label={t('toolbar.arrangement')}
              value={view.arrangement}
              options={(['vertical', 'columns', 'grid'] as const).map((key) => ({
                key,
                label: t(ARRANGEMENT_LABEL_KEYS[key]),
              }))}
              onChange={(key) => void updateView(view.id, { arrangement: key as GroupArrangement })}
            />
            {view.arrangement !== 'vertical' ? (
              <select
                className="compact-select"
                aria-label={t('view.field.columns')}
                value={view.gridColumns}
                onChange={(e) => void updateView(view.id, { gridColumns: Number(e.target.value) })}
              >
                {[1, 2, 3, 4].map((n) => (
                  <option value={n} key={n}>
                    {n} ×
                  </option>
                ))}
              </select>
            ) : null}
          </>
        ) : null}
      </div>
    </header>
  )
}
