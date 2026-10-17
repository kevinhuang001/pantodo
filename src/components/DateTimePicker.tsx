import { useState, type ReactNode } from 'react'
import { format } from 'date-fns'
import { enUS, zhCN, ja } from 'date-fns/locale'
import { useAppStore } from '@/domain/store'
import { getLocale, t } from '@/i18n'
import { Calendar } from './ui/calendar'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { SelectField } from './SelectField'

export function DatePickerPopover({
  value,
  fallback,
  onChange,
  children,
  dateOnly = false,
}: {
  value: string
  fallback?: string
  onChange: (value: string) => void
  children: ReactNode
  dateOnly?: boolean
}) {
  const [open, setOpen] = useState(false)
  const weekStartsOn = useAppStore((s) => s.settings.weekStartsOn)
  const cursor = value || fallback || format(new Date(), "yyyy-MM-dd'T'09:00")
  const selected = new Date(dateOnly ? cursor.slice(0, 10) + 'T00:00' : cursor)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="date-popover" align="start" collisionPadding={12}>
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          weekStartsOn={weekStartsOn}
          locale={{ 'zh-CN': zhCN, en: enUS, ja }[getLocale()]}
          onSelect={(date) => {
            if (date) {
              onChange(
                format(date, 'yyyy-MM-dd') + (dateOnly ? '' : 'T' + (cursor.slice(11) || '09:00')),
              )
              setOpen(false)
            }
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export function TimePickerPopover({
  value,
  fallback,
  onChange,
  children,
}: {
  value: string
  fallback?: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('09:00')
  const cursor = value || fallback || format(new Date(), "yyyy-MM-dd'T'09:00")
  const valid = /^([01]\d|2[0-3]):[0-5]\d$/.test(draft)
  const [hour = '09', minute = '00'] = draft.split(':')
  const minutes = Array.from(
    new Set([...Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')), minute]),
  ).sort()
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(cursor.slice(11) || '09:00')
        setOpen(next)
      }}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="time-popover" align="start" collisionPadding={12}>
        <label className="field">
          <span>{t('picker.time')}</span>
          <Input
            aria-label={t('picker.time')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="HH:mm"
          />
        </label>
        <div className="time-columns">
          <SelectField
            aria-label={t('picker.hour')}
            value={hour}
            onValueChange={(v) => setDraft(v + ':' + minute)}
          >
            {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </SelectField>
          <span>:</span>
          <SelectField
            aria-label={t('picker.minute')}
            value={minute}
            onValueChange={(v) => setDraft(hour + ':' + v)}
          >
            {minutes.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </SelectField>
        </div>
        <Button
          disabled={!valid}
          onClick={() => {
            onChange(cursor.slice(0, 10) + 'T' + draft)
            setOpen(false)
          }}
        >
          {t('picker.done')}
        </Button>
      </PopoverContent>
    </Popover>
  )
}
