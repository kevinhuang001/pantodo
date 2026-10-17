import { useState } from 'react'
import { Check, Timer } from 'lucide-react'
import { t } from '@/i18n'
import { Button } from './ui/button'
import { SelectField } from './SelectField'
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover'

const PRESETS = [15, 30, 45, 60, 90, 120]
function duration(minutes: number) {
  const h = Math.floor(minutes / 60),
    m = minutes % 60
  return (h ? `${h}${t('picker.hours')}` : '') + (m ? `${m}${t('picker.minutesShort')}` : '')
}
export function CaptureEstimatePicker({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState(30)
  const hour = Math.floor(draft / 60),
    minute = draft % 60
  return (
    <Popover
      open={open}
      onOpenChange={(open) => {
        if (open) setDraft(Number(value) || 30)
        setOpen(open)
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          type="button"
          className="capture-property"
          data-filled={!!value}
          aria-label={t('plan.duration')}
        >
          <Timer size={15} />
          <span>{value ? duration(Number(value)) : t('plan.duration')}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="capture-estimate-picker"
        side="top"
        align="start"
        sideOffset={10}
        collisionPadding={12}
      >
        <header className="capture-picker-heading">
          <span className="picker-emblem">
            <Timer size={18} />
          </span>
          <strong>{t('plan.duration')}</strong>
        </header>
        <output className="duration-preview" aria-live="polite">
          {duration(draft) || '0' + t('picker.minutesShort')}
        </output>
        <div className="estimate-presets" role="group" aria-label={t('plan.duration')}>
          {PRESETS.map((minutes) => (
            <Button
              key={minutes}
              variant="ghost"
              aria-pressed={draft === minutes}
              onClick={() => {
                onChange(String(minutes))
                setOpen(false)
              }}
            >
              {duration(minutes)}
            </Button>
          ))}
        </div>
        <div className="duration-custom">
          <span>{t('picker.custom')}</span>
          <div>
            <SelectField
              aria-label={t('picker.hour')}
              value={String(hour)}
              onValueChange={(h) => setDraft(Math.min(100000, Number(h) * 60 + minute))}
            >
              {Array.from({ length: 1667 }, (_, h) => (
                <option value={String(h)} key={h}>
                  {String(h)}
                </option>
              ))}
            </SelectField>
            <span>{t('picker.hours')}</span>
            <SelectField
              aria-label={t('picker.minute')}
              value={String(minute)}
              onValueChange={(m) => setDraft(hour * 60 + Number(m))}
            >
              {Array.from({ length: 60 }, (_, m) => (
                <option value={String(m)} key={m} disabled={hour * 60 + m > 100000}>
                  {String(m)}
                </option>
              ))}
            </SelectField>
            <span>{t('picker.minutesShort')}</span>
          </div>
        </div>
        <footer className="capture-picker-footer">
          <Button
            size="sm"
            disabled={draft < 1 || draft > 100000}
            onClick={() => {
              onChange(String(draft))
              setOpen(false)
            }}
          >
            <Check size={13} />
            {t('picker.done')}
          </Button>
        </footer>
      </PopoverContent>
    </Popover>
  )
}
