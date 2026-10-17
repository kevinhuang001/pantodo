import { useState } from 'react'
import { CalendarDays, Check, Clock3, X } from 'lucide-react'
import { changeSchedule, type ScheduleEndpoint, type ScheduleValues } from '@/domain/planning'
import { getLocale, t } from '@/i18n'
import { DatePickerPopover, TimePickerPopover } from './DateTimePicker'
import { Button } from './ui/button'
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover'

const endpoints = ['start', 'end', 'due'] as const
const labels = { start: 'plan.start', end: 'plan.end', due: 'task.field.due' } as const

export function CaptureSchedulePicker({
  value,
  onChange,
}: {
  value: ScheduleValues
  onChange: (value: ScheduleValues) => void
}) {
  const [open, setOpen] = useState(false)
  const displayDate = (raw: string) =>
    new Intl.DateTimeFormat(getLocale(), { month: 'short', day: 'numeric' }).format(new Date(raw))
  const invalid =
    !!(value.start || value.end) && (!value.start || !value.end || value.end <= value.start)
  const summary = value.start
    ? displayDate(value.start) +
      ' ' +
      value.start.slice(11) +
      (value.end ? '–' + value.end.slice(11) : '')
    : value.due
      ? displayDate(value.due) + ' · ' + t('capture.due')
      : t('picker.time')
  const update = (endpoint: ScheduleEndpoint, next: string) =>
    onChange(changeSchedule(value, endpoint, next))
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          type="button"
          className="capture-property"
          data-filled={!!(value.start || value.due)}
          aria-label={t('plan.title')}
        >
          <CalendarDays size={15} />
          <span>{summary}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="capture-schedule-picker"
        align="start"
        sideOffset={8}
        collisionPadding={12}
      >
        <header className="schedule-head">
          <CalendarDays size={17} />
          <strong>{t('plan.title')}</strong>
        </header>
        <div className="schedule-endpoints">
          {endpoints.map((endpoint) => (
            <div className="schedule-endpoint" key={endpoint} data-endpoint={endpoint}>
              <span>{t(labels[endpoint])}</span>
              <div>
                <DatePickerPopover
                  value={value[endpoint]}
                  fallback={endpoint === 'end' ? value.start : undefined}
                  onChange={(next) => update(endpoint, next)}
                >
                  <Button
                    variant="outline"
                    aria-label={t(labels[endpoint]) + ' · ' + t('calendar.range')}
                  >
                    <CalendarDays size={13} />
                    {value[endpoint] ? displayDate(value[endpoint]) : '—'}
                  </Button>
                </DatePickerPopover>
                <TimePickerPopover
                  value={value[endpoint]}
                  fallback={endpoint === 'end' ? value.start : undefined}
                  onChange={(next) => update(endpoint, next)}
                >
                  <Button
                    variant="outline"
                    aria-label={t(labels[endpoint]) + ' · ' + t('picker.time')}
                  >
                    <Clock3 size={13} />
                    {value[endpoint] ? value[endpoint].slice(11) : '—'}
                  </Button>
                </TimePickerPopover>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!value[endpoint]}
                  aria-label={t('picker.clearDate') + ' · ' + t(labels[endpoint])}
                  onClick={() => update(endpoint, '')}
                >
                  <X size={13} />
                </Button>
              </div>
            </div>
          ))}
        </div>
        {invalid ? (
          <p role="alert" className="form-error">
            {t('time.invalidRange')}
          </p>
        ) : null}
        <footer className="capture-picker-footer">
          <Button
            variant="ghost"
            size="sm"
            disabled={!(value.start || value.end || value.due)}
            onClick={() => onChange({ ...value, start: '', end: '', due: '' })}
          >
            <X size={13} />
            {t('picker.clearDate')}
          </Button>
          <Button size="sm" disabled={invalid} onClick={() => setOpen(false)}>
            <Check size={13} />
            {t('picker.done')}
          </Button>
        </footer>
      </PopoverContent>
    </Popover>
  )
}
