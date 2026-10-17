import { useState, useId } from 'react'
import { CalendarDays, Check, Clock3, X } from 'lucide-react'
import { format } from 'date-fns'
import { enUS, zhCN, ja } from 'date-fns/locale'
import { useAppStore } from '@/domain/store'
import { changeSchedule, type ScheduleEndpoint, type ScheduleValues } from '@/domain/planning'
import { getLocale, t } from '@/i18n'
import { Calendar } from './ui/calendar'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover'
import { SelectField } from './SelectField'
const endpoints = ['start', 'end', 'due'] as const
const labels = { start: 'plan.start', end: 'plan.end', due: 'task.field.due' } as const
export function CaptureSchedulePicker({
  value,
  onChange,
}: {
  value: ScheduleValues
  onChange: (value: ScheduleValues) => void
}) {
  const id = useId()
  const [open, setOpen] = useState(false),
    [endpoint, setEndpoint] = useState<ScheduleEndpoint>('start')
  const duration = useAppStore((s) => s.settings.defaultDurationMinutes ?? 30)
  const weekStartsOn = useAppStore((s) => s.settings.weekStartsOn)
  const locale = getLocale(),
    raw = value[endpoint],
    selected = raw ? new Date(raw) : undefined
  const hasTime = !!(value.start || value.due || value.estimate)
  const invalid = !!(value.start && value.end && value.end <= value.start)
  const displayDate = (raw: string) =>
    new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(new Date(raw))
  const summary = value.start
    ? displayDate(value.start) + ' · ' + value.start.slice(11)
    : value.due
      ? displayDate(value.due) + ' · ' + t('task.field.due')
      : value.estimate
        ? value.estimate + ' ' + t('picker.minutes')
        : t('plan.more')
  const update = (next: string) => onChange(changeSchedule(value, endpoint, next, duration))
  const changeTime = (part: 'hour' | 'minute', next: string) => {
    const day = raw.slice(0, 10) || format(new Date(), 'yyyy-MM-dd'),
      [hour, minute] = (raw.slice(11) || '09:00').split(':')
    update(day + 'T' + (part === 'hour' ? next : hour) + ':' + (part === 'minute' ? next : minute))
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          type="button"
          className="capture-property"
          data-filled={hasTime}
          aria-label={t('plan.more')}
        >
          <CalendarDays size={15} />
          <span>{summary}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="capture-schedule-picker"
        side="right"
        align="center"
        sideOffset={12}
        collisionPadding={12}
      >
        <div className="schedule-endpoints" role="tablist" aria-label={t('plan.title')}>
          {endpoints.map((key) => (
            <Button
              variant="ghost"
              role="tab"
              id={id + key}
              aria-controls={id + '-calendar'}
              tabIndex={endpoint === key ? 0 : -1}
              aria-selected={endpoint === key}
              aria-label={t(labels[key])}
              key={key}
              onClick={() => setEndpoint(key)}
              onKeyDown={(event) => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
                event.preventDefault()
                const index = endpoints.indexOf(key),
                  next =
                    event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? 2
                        : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3
                setEndpoint(endpoints[next]!)
                document.getElementById(id + endpoints[next])?.focus()
              }}
            >
              <span>{t(labels[key])}</span>
              <strong>
                {value[key]
                  ? displayDate(value[key]) + ' ' + value[key].slice(11)
                  : t('picker.unset')}
              </strong>
            </Button>
          ))}
        </div>
        <div id={id + '-calendar'} role="tabpanel" aria-labelledby={id + endpoint}>
          <Calendar
            key={endpoint}
            mode="single"
            required
            selected={selected}
            defaultMonth={selected}
            weekStartsOn={weekStartsOn}
            locale={{ 'zh-CN': zhCN, en: enUS, ja }[locale]}
            onSelect={(date) => {
              if (date) update(format(date, 'yyyy-MM-dd') + 'T' + (raw.slice(11) || '09:00'))
            }}
          />
        </div>
        <div className="schedule-picker-fields">
          <div className="schedule-clock">
            <span>
              <Clock3 size={14} />
              {t('picker.time')}
            </span>
            <div>
              <SelectField
                aria-label={t('picker.hour')}
                value={raw.slice(11, 13) || '09'}
                onValueChange={(v) => changeTime('hour', v)}
              >
                {Array.from({ length: 24 }, (_, n) => String(n).padStart(2, '0')).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </SelectField>
              <b>:</b>
              <SelectField
                aria-label={t('picker.minute')}
                value={raw.slice(14, 16) || '00'}
                onValueChange={(v) => changeTime('minute', v)}
              >
                {Array.from({ length: 60 }, (_, n) => String(n).padStart(2, '0')).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>
          <label className="schedule-estimate" htmlFor="create-estimate">
            <span>{t('picker.estimate')}</span>
            <div>
              <Input
                id="create-estimate"
                type="number"
                min={1}
                max={100000}
                step={1}
                placeholder="—"
                value={value.estimate}
                onChange={(e) => {
                  const estimate = e.target.value
                  if (
                    !estimate ||
                    (/^\d+$/.test(estimate) && Number(estimate) >= 1 && Number(estimate) <= 100000)
                  )
                    onChange({ ...value, estimate })
                }}
              />
              <span>{t('picker.minutes')}</span>
            </div>
          </label>
        </div>
        {invalid ? (
          <p role="alert" className="form-error">
            {t('time.invalidRange')}
          </p>
        ) : null}
        <footer className="capture-picker-footer">
          <Button variant="ghost" size="sm" disabled={!raw} onClick={() => update('')}>
            <X size={13} />
            {t('picker.clearDate')}
          </Button>
          <Button size="sm" onClick={() => setOpen(false)} disabled={invalid}>
            <Check size={13} />
            {t('picker.done')}
          </Button>
        </footer>
      </PopoverContent>
    </Popover>
  )
}
