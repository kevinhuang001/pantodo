import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip'
import { Rows3, Columns3 } from 'lucide-react'
import { beginWindowDrag } from '@/window'
import { viewDisplayName, ARRANGEMENT_LABEL_KEYS } from '@/domain/display'
import { useAppStore } from '@/domain/store'
import type { AppTab, View } from '@/domain/types'
import { t } from '@/i18n'
import { Icon } from './Icon'
import { Button } from './ui/button'
import { PresentationPicker } from './PresentationPicker'

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
  const patch = (value: Partial<View>) => {
    if (view)
      void useAppStore
        .getState()
        .updateView(view.id, value)
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
      {showModes && view.preset === null ? (
        <TooltipProvider delayDuration={250} disableHoverableContent>
          <div className="view-presentation" role="group" aria-label={t('toolbar.arrangement')}>
            {(
              [
                { key: 'vertical', icon: Rows3 },
                { key: 'columns', icon: Columns3 },
              ] as const
            ).map(({ key, icon: ModeIcon }) => (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={t(ARRANGEMENT_LABEL_KEYS[key])}
                    aria-pressed={view.arrangement === key}
                    onClick={() => patch({ arrangement: key })}
                  >
                    <ModeIcon size={14} />
                    <span>{t(ARRANGEMENT_LABEL_KEYS[key])}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={7}>
                  {t(`panel.layout.${key}`)}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      ) : showModes ? (
        <PresentationPicker
          value={view.presentation}
          onChange={(presentation) => patch({ presentation })}
        />
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
