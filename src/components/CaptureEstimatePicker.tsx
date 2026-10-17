import { useState } from 'react'
import { Check, Timer, X } from 'lucide-react'
import { t } from '@/i18n'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover'

const PRESETS = [15, 30, 45, 60, 90, 120]

/** A duration is its own property, so it gets its own compact chooser instead of sharing the date popover. */
export function CaptureEstimatePicker({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const estimate = Number(value)
  const valid = value === '' || (/^\d+$/.test(value) && estimate >= 1 && Number(value) <= 100000)
  const label = (minutes: number) => {
    if (minutes < 60) return `${minutes}${t('picker.minutesShort')}`
    const hours = Math.floor(minutes / 60),
      rest = minutes % 60
    return rest
      ? `${hours}${t('picker.hours')}${rest}${t('picker.minutesShort')}`
      : `${hours}${t('picker.hours')}`
  }
  const detail = (minutes: number) => {
    if (minutes < 60) return `${minutes} ${t('picker.minutes')}`
    const hours = Math.floor(minutes / 60),
      rest = minutes % 60
    return rest
      ? `${hours} ${t('picker.hours')} ${rest} ${t('picker.minutes')}`
      : `${hours} ${t('picker.hours')}`
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          type="button"
          className="capture-property"
          data-filled={Boolean(value)}
          aria-label={t('picker.estimate')}
        >
          <Timer size={15} />
          <span>{value ? label(estimate) : t('capture.estimateShort')}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="capture-estimate-picker"
        side="right"
        align="center"
        sideOffset={12}
        collisionPadding={12}
      >
        <header className="estimate-head">
          <span>{t('picker.estimate')}</span>
          <strong>{value ? detail(estimate) : t('picker.unset')}</strong>
        </header>
        <div className="estimate-presets" role="group" aria-label={t('picker.estimate')}>
          {PRESETS.map((minutes) => (
            <Button
              key={minutes}
              type="button"
              variant={estimate === minutes ? 'default' : 'outline'}
              className="estimate-preset"
              aria-pressed={estimate === minutes}
              onClick={() => {
                onChange(String(minutes))
                setOpen(false)
              }}
            >
              {label(minutes)}
            </Button>
          ))}
        </div>
        <label className="estimate-custom" htmlFor="create-estimate">
          <span>{t('picker.custom')}</span>
          <div>
            <Input
              id="create-estimate"
              type="number"
              min={1}
              max={100000}
              step={1}
              placeholder="—"
              value={value}
              onChange={(event) => {
                const next = event.target.value
                if (!next || (/^\d+$/.test(next) && Number(next) >= 1 && Number(next) <= 100000))
                  onChange(next)
              }}
            />
            <span>{t('picker.minutes')}</span>
          </div>
        </label>
        <footer className="capture-picker-footer">
          <Button
            variant="ghost"
            size="sm"
            disabled={!value}
            onClick={() => {
              onChange('')
              setOpen(false)
            }}
          >
            <X size={13} />
            {t('picker.clearEstimate')}
          </Button>
          <Button size="sm" onClick={() => setOpen(false)} disabled={!valid}>
            <Check size={13} />
            {t('picker.done')}
          </Button>
        </footer>
      </PopoverContent>
    </Popover>
  )
}
