import { useEffect, useRef, useState, type ReactNode } from 'react'
import { format, startOfDay } from 'date-fns'
import { enUS, zhCN, ja } from 'date-fns/locale'
import { Clock3, Check } from 'lucide-react'
import { useAppStore } from '@/domain/store'
import { getLocale, t } from '@/i18n'
import { Calendar } from './ui/calendar'
import { Button } from './ui/button'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

export function DatePickerPopover({
  value,
  fallback,
  onChange,
  children,
  dateOnly = false,
  min,
}: {
  value: string
  fallback?: string
  onChange: (value: string) => void
  children: ReactNode
  dateOnly?: boolean
  min?: string
}) {
  const [open, setOpen] = useState(false)
  const weekStartsOn = useAppStore((s) => s.settings.weekStartsOn)
  const cursor = value || fallback || format(new Date(), "yyyy-MM-dd'T'09:00")
  const selected = new Date(dateOnly ? cursor.slice(0, 10) + 'T00:00' : cursor)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="date-popover" side="right" align="center" collisionPadding={12}>
        <Calendar
          mode="single"
          required
          selected={selected}
          defaultMonth={selected}
          weekStartsOn={weekStartsOn}
          disabled={min ? { before: startOfDay(new Date(min)) } : undefined}
          locale={{ 'zh-CN': zhCN, en: enUS, ja }[getLocale()]}
          onSelect={(date) => {
            if (date) {
              const next =
                format(date, 'yyyy-MM-dd') + (dateOnly ? '' : 'T' + (cursor.slice(11) || '09:00'))
              onChange(min && next < min ? min : next)
              setOpen(false)
            }
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

function TimeColumn({
  unit,
  value,
  onChange,
}: {
  unit: 'hour' | 'minute'
  value: string
  onChange: (value: string) => void
}) {
  const list = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = list.current,
      selected = element?.querySelector<HTMLElement>('[aria-selected=true]')
    if (element && selected)
      element.scrollTop = selected.offsetTop - (element.clientHeight - selected.offsetHeight) / 2
  }, [value])
  const values = Array.from({ length: unit === 'hour' ? 24 : 60 }, (_, i) =>
    String(i).padStart(2, '0'),
  )
  return (
    <div className="clock-column">
      <span>{t(unit === 'hour' ? 'picker.hour' : 'picker.minute')}</span>
      <div
        ref={list}
        role="listbox"
        aria-label={t(unit === 'hour' ? 'picker.hour' : 'picker.minute')}
        data-unit={unit}
        className="clock-options"
        onKeyDown={(e) => {
          if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return
          e.preventDefault()
          const next =
            e.key === 'Home'
              ? 0
              : e.key === 'End'
                ? values.length - 1
                : Math.max(
                    0,
                    Math.min(values.length - 1, Number(value) + (e.key === 'ArrowDown' ? 1 : -1)),
                  )
          onChange(values[next]!)
          list.current?.querySelector<HTMLElement>(`[data-value="${values[next]}"]`)?.focus()
        }}
      >
        {values.map((number) => (
          <button
            type="button"
            role="option"
            aria-selected={value === number}
            tabIndex={value === number ? 0 : -1}
            key={number}
            data-value={number}
            onClick={() => onChange(number)}
          >
            {number}
          </button>
        ))}
      </div>
    </div>
  )
}

export function TimePickerPopover({
  value,
  fallback,
  onChange,
  children,
  min,
}: {
  value: string
  fallback?: string
  onChange: (value: string) => void
  children: ReactNode
  min?: string
}) {
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState('09:00')
  const cursor = value || fallback || format(new Date(), "yyyy-MM-dd'T'09:00")
  const [hour = '09', minute = '00'] = draft.split(':')
  const next = cursor.slice(0, 10) + 'T' + draft
  return (
    <Popover
      open={open}
      onOpenChange={(open) => {
        if (open) setDraft(cursor.slice(11) || '09:00')
        setOpen(open)
      }}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="time-popover" side="right" align="center" collisionPadding={12}>
        <header className="clock-preview">
          <Clock3 size={16} />
          <output aria-live="polite">
            {hour}
            <span>:</span>
            {minute}
          </output>
        </header>
        <div className="clock-columns">
          <TimeColumn unit="hour" value={hour} onChange={(h) => setDraft(h + ':' + minute)} />
          <TimeColumn unit="minute" value={minute} onChange={(m) => setDraft(hour + ':' + m)} />
        </div>
        <footer>
          <Button
            size="sm"
            disabled={!!min && next < min}
            onClick={() => {
              onChange(next)
              setOpen(false)
            }}
          >
            <Check size={14} />
            {t('picker.done')}
          </Button>
        </footer>
      </PopoverContent>
    </Popover>
  )
}
