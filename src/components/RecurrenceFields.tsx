import { Repeat2 } from 'lucide-react'
import { useState } from 'react'
import { dateKey, localDate, validRecurrence } from '@/domain/recurrence'
import type { RecurrenceRule } from '@/domain/types'
import { getLocale, t } from '@/i18n'
import { SelectField } from './SelectField'
import { DateTimeField } from './DateTimeField'
import { Input } from './ui/input'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

export function RecurrenceFields({
  value,
  onChange,
  start,
}: {
  value: RecurrenceRule | null
  onChange: (rule: RecurrenceRule | null) => void
  start?: string
}) {
  const [open, setOpen] = useState(false)
  const anchor = start ? new Date(start) : new Date()
  const rule: RecurrenceRule = value ?? {
    frequency: 'weekly',
    interval: 1,
    startDate: dateKey(anchor),
    weekdays: [anchor.getDay()],
  }
  const end = rule.count ? 'count' : rule.until ? 'until' : 'never'
  const update = (patch: Partial<RecurrenceRule>) => onChange({ ...rule, ...patch })
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={'repeat-trigger capture-option' + (value ? ' active' : '')}
          aria-label={t('repeat.title')}
        >
          <Repeat2 size={15} />
          <span>
            {value ? t(('repeat.' + value.frequency) as 'repeat.daily') : t('repeat.none')}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="repeat-popover" align="start" collisionPadding={12}>
        <div className="repeat-heading">
          <Repeat2 size={17} />
          <strong>{t('repeat.title')}</strong>
        </div>
        <SelectField
          aria-label={t('repeat.frequency')}
          value={value?.frequency ?? 'none'}
          onValueChange={(frequency) =>
            onChange(
              frequency === 'none'
                ? null
                : { ...rule, frequency: frequency as RecurrenceRule['frequency'] },
            )
          }
        >
          <option value="none">{t('repeat.none')}</option>
          {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((f) => (
            <option key={f} value={f}>
              {t(('repeat.' + f) as 'repeat.daily')}
            </option>
          ))}
        </SelectField>
        {value ? (
          <>
            <div className="repeat-row">
              <label htmlFor="repeat-interval">{t('repeat.every')}</label>
              <Input
                id="repeat-interval"
                type="number"
                min={1}
                max={999}
                value={rule.interval}
                onChange={(e) => update({ interval: Number(e.target.value) })}
              />
              <span>{t(('repeat.unit.' + rule.frequency) as 'repeat.unit.daily')}</span>
            </div>
            <div className="field">
              <label>{t('repeat.starts')}</label>
              <DateTimeField
                dateOnly
                aria-label={t('repeat.starts')}
                value={rule.startDate}
                onChange={(startDate) => {
                  if (startDate) update({ startDate })
                }}
              />
            </div>
            {rule.frequency === 'weekly' ? (
              <div className="repeat-weekdays" role="group" aria-label={t('repeat.weekdays')}>
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <button
                    type="button"
                    key={d}
                    aria-pressed={rule.weekdays.includes(d)}
                    onClick={() => {
                      const weekdays = rule.weekdays.includes(d)
                        ? rule.weekdays.filter((day) => day !== d)
                        : [...rule.weekdays, d]
                      if (weekdays.length) update({ weekdays })
                    }}
                  >
                    {new Intl.DateTimeFormat(getLocale(), { weekday: 'short' }).format(
                      new Date(2026, 9, 18 + d),
                    )}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="field">
              <label>{t('repeat.ends')}</label>
              <SelectField
                aria-label={t('repeat.ends')}
                value={end}
                onValueChange={(next) =>
                  update({
                    count: next === 'count' ? 10 : null,
                    until: next === 'until' ? rule.startDate : null,
                  })
                }
              >
                <option value="never">{t('repeat.never')}</option>
                <option value="until">{t('repeat.until')}</option>
                <option value="count">{t('repeat.count')}</option>
              </SelectField>
            </div>
            {end === 'count' ? (
              <Input
                type="number"
                aria-label={t('repeat.count')}
                min={1}
                max={10000}
                value={rule.count ?? 10}
                onChange={(e) => update({ count: Number(e.target.value) })}
              />
            ) : null}
            {end === 'until' ? (
              <DateTimeField
                dateOnly
                aria-label={t('repeat.until')}
                value={rule.until ?? ''}
                min={rule.startDate}
                onChange={(until) => update({ until: until || null })}
              />
            ) : null}
            {rule.frequency === 'monthly' || rule.frequency === 'yearly' ? (
              <p className="field-hint">
                {t('repeat.monthHint', { day: localDate(rule.startDate).getDate() })}
              </p>
            ) : null}
          </>
        ) : null}
        <button
          type="button"
          className="primary"
          disabled={!!value && !validRecurrence(value)}
          onClick={() => setOpen(false)}
        >
          {t('picker.done')}
        </button>
      </PopoverContent>
    </Popover>
  )
}
