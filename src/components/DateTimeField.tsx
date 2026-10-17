import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { enUS, zhCN, ja } from 'date-fns/locale'
import { getLocale, t } from '@/i18n'
import { Calendar } from './ui/calendar'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover'
type Props = Omit<ComponentProps<'input'>, 'type'> & { dateOnly?: boolean }
export function DateTimeField({ value, onChange, className, dateOnly = false, ...props }: Props) {
  const raw = String(value ?? ''),
    parsed = raw ? new Date(dateOnly ? raw + 'T00:00' : raw) : undefined
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
  const [timeDraft, setTimeDraft] = useState(raw.split('T')[1] || '')
  useEffect(() => setTimeDraft(raw.split('T')[1] || ''), [raw])
  const selected = parsed && !Number.isNaN(parsed.getTime()) ? parsed : undefined
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
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={props['aria-label'] ?? t('plan.title')}
          >
            <CalendarIcon size={15} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="date-popover" align="start">
          <Calendar
            mode="single"
            locale={{ 'zh-CN': zhCN, en: enUS, ja }[getLocale()]}
            selected={selected}
            defaultMonth={selected}
            onSelect={(date) => {
              if (date)
                change(
                  format(date, 'yyyy-MM-dd') +
                    (dateOnly ? '' : 'T' + (raw.split('T')[1] || '09:00')),
                )
            }}
          />
          {!dateOnly ? (
            <div className="date-time-row">
              <label>
                {t('plan.start')}
                <Input
                  aria-label={t('plan.start')}
                  placeholder="HH:mm"
                  value={timeDraft}
                  onChange={(e) => {
                    const time = e.target.value
                    setTimeDraft(time)
                    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
                      change((raw.split('T')[0] || format(new Date(), 'yyyy-MM-dd')) + 'T' + time)
                  }}
                />
              </label>
              <Button type="button" variant="ghost" onClick={() => change('')}>
                {t('plan.clear')}
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  )
}
