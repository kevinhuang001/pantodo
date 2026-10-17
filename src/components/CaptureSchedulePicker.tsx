import { useState } from 'react'
import { CalendarDays, Check, Clock3, X, Flag, ArrowDownRight } from 'lucide-react'
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
  const [draft, setDraft] = useState(value)
  const displayDate = (raw: string) =>
    new Intl.DateTimeFormat(getLocale(), { month: 'short', day: 'numeric' }).format(new Date(raw))
  const invalid =
    !!(draft.start || draft.end) && (!draft.start || !draft.end || draft.end <= draft.start)
  const summary = value.start
    ? displayDate(value.start) +
      ' ' +
      value.start.slice(11) +
      (value.end ? '–' + value.end.slice(11) : '')
    : value.due
      ? displayDate(value.due) + ' · ' + t('capture.due')
      : t('picker.time')
  const update = (endpoint: ScheduleEndpoint, next: string) =>
    setDraft(changeSchedule(draft, endpoint, next))
  return (
    <Popover
      open={open}
      onOpenChange={(open) => {
        if (open) setDraft(value)
        setOpen(open)
      }}
    >
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
        side="top"
        align="start"
        sideOffset={10}
        collisionPadding={12}
      >
        <header className="capture-picker-heading">
          <span className="picker-emblem">
            <CalendarDays size={18} />
          </span>
          <strong>{t('plan.title')}</strong>
        </header>
        <div className="schedule-endpoints">
          {endpoints.map((endpoint) => (
            <div className="schedule-endpoint" key={endpoint} data-endpoint={endpoint}>
              <span className="endpoint-label">
                {endpoint === 'due' ? (
                  <Flag size={14} />
                ) : endpoint === 'end' ? (
                  <ArrowDownRight size={14} />
                ) : (
                  <CalendarDays size={14} />
                )}
                <span>{t(labels[endpoint])}</span>
              </span>
              <div>
                <DatePickerPopover
                  value={draft[endpoint]}
                  fallback={endpoint === 'end' ? draft.start : undefined}
                  onChange={(next) => update(endpoint, next)}
                >
                  <Button
                    variant="ghost"
                    aria-label={t(labels[endpoint]) + ' · ' + t('calendar.range')}
                  >
                    <CalendarDays size={13} />
                    {draft[endpoint] ? displayDate(draft[endpoint]) : t('picker.chooseDate')}
                  </Button>
                </DatePickerPopover>
                <TimePickerPopover
                  value={draft[endpoint]}
                  fallback={endpoint === 'end' ? draft.start : undefined}
                  onChange={(next) => update(endpoint, next)}
                >
                  <Button
                    variant="ghost"
                    aria-label={t(labels[endpoint]) + ' · ' + t('picker.time')}
                  >
                    <Clock3 size={13} />
                    {draft[endpoint] ? draft[endpoint].slice(11) : '—'}
                  </Button>
                </TimePickerPopover>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!draft[endpoint]}
                  aria-label={t('picker.clearDate') + ' · ' + t(labels[endpoint])}
                  onClick={() => update(endpoint, '')}
                >
                  <X size={13} />
                </Button>
              </div>
            </div>
          ))}
        </div>
        {draft.start && draft.end && draft.end <= draft.start ? (
          <p role="alert" className="form-error">
            {t('time.invalidRange')}
          </p>
        ) : null}
        <footer className="capture-picker-footer">
          <Button
            variant="ghost"
            size="sm"
            disabled={!(draft.start || draft.end || draft.due)}
            onClick={() => setDraft({ ...draft, start: '', end: '', due: '' })}
          >
            <X size={13} />
            {t('picker.clearDate')}
          </Button>
          <Button
            size="sm"
            disabled={invalid}
            onClick={() => {
              onChange(draft)
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
