import { List, LayoutGrid } from 'lucide-react'
import type { ViewPresentation } from '@/domain/types'
import { t } from '@/i18n'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip'

export function PresentationPicker({
  value,
  onChange,
}: {
  value: ViewPresentation
  onChange: (value: ViewPresentation) => void
}) {
  return (
    <TooltipProvider delayDuration={250} disableHoverableContent>
      <div className="view-presentation" role="group" aria-label={t('view.presentation')}>
        {(
          [
            { key: 'list', icon: List },
            { key: 'gallery', icon: LayoutGrid },
          ] as const
        ).map(({ key, icon: ModeIcon }) => (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={t(`view.${key}`)}
                aria-pressed={value === key}
                onClick={() => onChange(key)}
              >
                <ModeIcon size={14} />
                <span>{t(`view.${key}`)}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={7}>
              {t(`view.tooltip.${key}`)}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  )
}
