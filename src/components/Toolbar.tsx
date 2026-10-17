import { List, LayoutGrid, Columns3, PanelsTopLeft } from 'lucide-react'
import { beginWindowDrag } from '@/window'
import { viewDisplayName } from '@/domain/display'
import { useAppStore } from '@/domain/store'
import type { AppTab, View, ViewPresentation } from '@/domain/types'
import { t } from '@/i18n'
import { Icon } from './Icon'
import { Button } from './ui/button'
const MODES = [
  { key: 'list', icon: List },
  { key: 'gallery', icon: LayoutGrid },
  { key: 'board', icon: Columns3 },
  { key: 'panels', icon: PanelsTopLeft },
] as const
export function Toolbar({
  tab,
  view,
  total,
  doneCount,
  onEditView,
}: {
  tab: AppTab
  view: View | null
  total: number
  doneCount: number
  onEditView: () => void
}) {
  const title =
    tab === 'statistics'
      ? t('nav.statistics')
      : tab === 'timetable'
        ? t('nav.tab.timetable')
        : view
          ? viewDisplayName(view, t)
          : t('views.section')
  const showModes = tab === 'views' && view && view.preset !== 'inbox'
  const presentation = view ? view.presentation : 'list'
  const change = (mode: ViewPresentation) => {
    if (!view) return
    void useAppStore
      .getState()
      .updateView(view.id, {
        presentation: mode,
      })
      .catch(() => useAppStore.getState().notify('work.failed'))
  }
  return (
    <header className="toolbar" onMouseDown={beginWindowDrag}>
      <div className="toolbar-title">
        <h1>
          {tab === 'views' && view?.emoji ? (
            <span className="title-emoji" aria-hidden="true">
              {view.emoji}{' '}
            </span>
          ) : null}
          {title}
        </h1>
        {showModes ? (
          <span className="view-task-count">
            {total - doneCount} / {total}
          </span>
        ) : null}
      </div>
      <span className="toolbar-spacer" />
      {showModes ? (
        <div className="view-presentation" role="group" aria-label={t('view.presentation')}>
          {MODES.filter((mode) => mode.key !== 'panels' || view.preset === null).map(
            ({ key, icon: ModeIcon }) => (
              <Button
                key={key}
                type="button"
                variant="ghost"
                size="sm"
                aria-label={t(('view.' + key) as 'view.list')}
                aria-pressed={presentation === key}
                onClick={() => change(key)}
                title={t(('view.' + key) as 'view.list')}
              >
                <ModeIcon size={14} />
                <span>{t(('view.' + key) as 'view.list')}</span>
              </Button>
            ),
          )}
        </div>
      ) : null}
      {tab === 'views' && view?.preset === null ? (
        <Button
          variant="ghost"
          size="icon-sm"
          className="view-settings"
          aria-label={t('view.settings')}
          onClick={onEditView}
        >
          <Icon name="sliders" size={15} />
        </Button>
      ) : null}
    </header>
  )
}
