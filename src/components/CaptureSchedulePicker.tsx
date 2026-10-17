import { useState } from 'react'
import { CalendarDays, Check, Flag, X, ArrowDownRight } from 'lucide-react'
import {
  changeSchedule,
  changeDuration,
  scheduleDuration,
  type ScheduleValues,
} from '@/domain/planning'
import { formatDateTime, fromLocalInputValue, formatMinutes } from '@/domain/date'
import { getLocale, t } from '@/i18n'
import { DateTimeField } from './DateTimeField'
import { CaptureEstimatePicker } from './CaptureEstimatePicker'
import { Button } from './ui/button'
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover'

export function CaptureSchedulePicker({
  value,
  onChange,
  dueOnly = false,
}: {
  value: ScheduleValues
  onChange: (value: ScheduleValues) => void
  dueOnly?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const date = (raw: string) => formatDateTime(fromLocalInputValue(raw), getLocale())
  const raw = dueOnly ? value.due : value.start
  const label = dueOnly ? t('task.field.due') : t('plan.title')
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(value)
        setOpen(next)
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          type="button"
          className="capture-property"
          data-filled={!!raw}
          aria-label={label}
        >
          {dueOnly ? <Flag size={15} /> : <CalendarDays size={15} />}
          <span>
            {raw
              ? date(raw) + (dueOnly ? '' : ' · ' + formatMinutes(scheduleDuration(value)))
              : dueOnly
                ? t('capture.due')
                : t('picker.time')}
          </span>
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
            {dueOnly ? <Flag size={18} /> : <CalendarDays size={18} />}
          </span>
          <strong>{label}</strong>
        </header>
        <div className="schedule-editor">
          <div className="schedule-endpoint" data-endpoint={dueOnly ? 'due' : 'start'}>
            <span className="endpoint-label">
              {dueOnly ? t('task.field.due') : t('plan.start')}
            </span>
            <DateTimeField
              value={dueOnly ? draft.due : draft.start}
              aria-label={dueOnly ? t('task.field.due') : t('plan.start')}
              onChange={(next) => setDraft(changeSchedule(draft, dueOnly ? 'due' : 'start', next))}
            />
          </div>
          {!dueOnly ? (
            <>
              <div className="schedule-duration-row">
                <span className="endpoint-label">{t('plan.duration')}</span>
                <CaptureEstimatePicker
                  value={String(scheduleDuration(draft))}
                  onChange={(next) => setDraft(changeDuration(draft, next))}
                />
              </div>
              {draft.end ? (
                <div className="schedule-result">
                  <ArrowDownRight size={14} />
                  <span>{t('plan.end')}</span>
                  <output>{date(draft.end)}</output>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
        <footer className="capture-picker-footer">
          <Button
            variant="ghost"
            size="sm"
            disabled={!(dueOnly ? draft.due : draft.start)}
            onClick={() => setDraft(changeSchedule(draft, dueOnly ? 'due' : 'start', ''))}
          >
            <X size={13} />
            {t('picker.clearDate')}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onChange(
                dueOnly
                  ? { ...value, due: draft.due }
                  : { ...value, start: draft.start, end: draft.end, estimate: draft.estimate },
              )
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
