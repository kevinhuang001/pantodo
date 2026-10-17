import { useState } from 'react'
import { Check, Timer } from 'lucide-react'
import { t } from '@/i18n'
import { Button } from './ui/button'
import { Input } from './ui/input'
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
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState(false)
  const [hours, setHours] = useState('0')
  const [minutes, setMinutes] = useState('30')
  const selected = Number(value) || 30
  const total = Number(hours) * 60 + Number(minutes)
  const valid =
    hours !== '' &&
    minutes !== '' &&
    Number.isInteger(Number(hours)) &&
    Number.isInteger(Number(minutes)) &&
    Number(hours) >= 0 &&
    Number(minutes) >= 0 &&
    Number(minutes) < 60 &&
    total >= 1 &&
    total <= 100000
  const apply = (next: number) => {
    onChange(String(next))
    setCustom(false)
    setOpen(false)
  }
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setCustom(false)
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
          <span>{value ? duration(selected) : t('plan.duration')}</span>
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
        <output className="duration-preview">{duration(selected)}</output>
        <div className="estimate-presets" role="group" aria-label={t('plan.duration')}>
          {PRESETS.map((next) => (
            <Button
              key={next}
              variant="ghost"
              aria-pressed={selected === next}
              onClick={() => apply(next)}
            >
              {duration(next)}
            </Button>
          ))}
          <Popover
            open={custom}
            onOpenChange={(next) => {
              if (next) {
                setHours(String(Math.floor(selected / 60)))
                setMinutes(String(selected % 60))
              }
              setCustom(next)
            }}
          >
            <PopoverTrigger asChild>
              <Button
                className="duration-custom-button"
                variant="ghost"
                aria-pressed={!PRESETS.includes(selected)}
              >
                {t('picker.custom')}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="duration-custom-dialog"
              side="right"
              align="center"
              collisionPadding={12}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  if (valid) apply(total)
                }
              }}
            >
              <strong>
                {t('picker.custom')} · {t('plan.duration')}
              </strong>
              <div className="duration-inputs">
                <label>
                  <span>{t('picker.hour')}</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={1666}
                    step={1}
                    value={hours}
                    onChange={(event) => setHours(event.target.value)}
                    aria-label={t('picker.hour')}
                  />
                </label>
                <span>:</span>
                <label>
                  <span>{t('picker.minute')}</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={59}
                    step={1}
                    value={minutes}
                    onChange={(event) => setMinutes(event.target.value)}
                    aria-label={t('picker.minute')}
                  />
                </label>
              </div>
              <footer>
                <Button variant="ghost" size="sm" onClick={() => setCustom(false)}>
                  {t('dialog.cancel')}
                </Button>
                <Button size="sm" disabled={!valid} onClick={() => apply(total)}>
                  <Check size={13} />
                  {t('picker.done')}
                </Button>
              </footer>
            </PopoverContent>
          </Popover>
        </div>
      </PopoverContent>
    </Popover>
  )
}
