import { CalendarDays, Clock3, X } from 'lucide-react'
import { getLocale, t } from '@/i18n'
import { DatePickerPopover, TimePickerPopover } from './DateTimePicker'
import { Button } from './ui/button'

export function DateTimeField({
  value,
  onChange,
  id,
  dateOnly = false,
  fallback,
  min,
  'aria-label': label,
}: {
  value: string
  onChange: (value: string) => void
  id?: string
  dateOnly?: boolean
  fallback?: string
  min?: string
  'aria-label'?: string
}) {
  const display = value
    ? new Intl.DateTimeFormat(getLocale(), {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date(dateOnly ? value + 'T00:00' : value))
    : t('picker.chooseDate')
  return (
    <div className="datetime-field" data-datetime-field={id} role="group" aria-label={label}>
      <DatePickerPopover
        value={value}
        fallback={fallback}
        min={min}
        dateOnly={dateOnly}
        onChange={onChange}
      >
        <Button
          id={id}
          type="button"
          variant="ghost"
          className="datetime-date"
          data-part="date"
          aria-label={label ? label + ' · ' + t('calendar.range') : undefined}
        >
          <CalendarDays size={14} />
          <span>{display}</span>
        </Button>
      </DatePickerPopover>
      {!dateOnly ? (
        <TimePickerPopover value={value} fallback={fallback} min={min} onChange={onChange}>
          <Button
            type="button"
            variant="ghost"
            className="datetime-clock"
            data-part="time"
            aria-label={(label || t('plan.title')) + ' · ' + t('picker.time')}
          >
            <Clock3 size={13} />
            {value ? value.slice(11) : '—'}
          </Button>
        </TimePickerPopover>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="datetime-clear"
        aria-label={t('picker.clearDate')}
        disabled={!value}
        onClick={() => onChange('')}
      >
        <X size={13} />
      </Button>
    </div>
  )
}
