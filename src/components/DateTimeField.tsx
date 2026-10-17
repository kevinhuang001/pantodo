import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { CalendarIcon, Clock3 } from 'lucide-react'
import { format } from 'date-fns'
import { t } from '@/i18n'
import { DatePickerPopover, TimePickerPopover } from './DateTimePicker'
import { Input } from './ui/input'
import { Button } from './ui/button'
type Props = Omit<ComponentProps<'input'>, 'type'> & { dateOnly?: boolean; fallback?: string }
export function DateTimeField({
  value,
  onChange,
  className,
  dateOnly = false,
  fallback,
  ...props
}: Props) {
  const raw = String(value ?? '')
  const [draft, setDraft] = useState(raw)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => setDraft(raw), [raw])
  const normalized = draft.replace(' ', 'T')
  const validFormat = dateOnly
    ? /^\d{4}-\d{2}-\d{2}$/.test(normalized)
    : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)
  const date = new Date(dateOnly ? normalized + 'T00:00' : normalized)
  const validDate =
    validFormat &&
    !Number.isNaN(date.getTime()) &&
    format(date, dateOnly ? 'yyyy-MM-dd' : "yyyy-MM-dd'T'HH:mm") === normalized
  const valid = !draft || (validDate && (!props.min || normalized >= String(props.min)))
  useEffect(() => {
    inputRef.current?.setCustomValidity(valid ? '' : t('time.invalidRange'))
  }, [valid])
  const change = (next: string) => {
    onChange?.({ target: { value: next }, currentTarget: { value: next } } as Parameters<
      NonNullable<Props['onChange']>
    >[0])
  }
  return (
    <div className="datetime-field">
      <Input
        {...props}
        ref={inputRef}
        value={draft}
        aria-invalid={!valid || undefined}
        className={className}
        type="text"
        placeholder={dateOnly ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm'}
        onChange={(event) => {
          const next = event.target.value
          setDraft(next)
          const normalized = next.replace(' ', 'T')
          const date = new Date(dateOnly ? normalized + 'T00:00' : normalized)
          const complete = (
            dateOnly ? /^\d{4}-\d{2}-\d{2}$/ : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/
          ).test(normalized)
          if (
            !next ||
            (complete &&
              !Number.isNaN(date.getTime()) &&
              format(date, dateOnly ? 'yyyy-MM-dd' : "yyyy-MM-dd'T'HH:mm") === normalized)
          )
            change(normalized)
        }}
      />
      <DatePickerPopover value={raw} fallback={fallback} dateOnly={dateOnly} onChange={change}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={(props['aria-label'] ?? t('plan.title')) + ' · ' + t('calendar.range')}
        >
          <CalendarIcon size={15} />
        </Button>
      </DatePickerPopover>
      {!dateOnly ? (
        <TimePickerPopover value={raw} fallback={fallback} onChange={change}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={(props['aria-label'] ?? t('plan.title')) + ' · ' + t('picker.time')}
          >
            <Clock3 size={15} />
          </Button>
        </TimePickerPopover>
      ) : null}
    </div>
  )
}
