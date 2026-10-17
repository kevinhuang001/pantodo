import { DateTimeField } from './DateTimeField'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { t } from '@/i18n'
import { changeSchedule, type ScheduleValues } from '@/domain/planning'
export function ScheduleFields({
  value,
  onChange,
  prefix = 'task',
}: {
  value: ScheduleValues
  onChange: (value: ScheduleValues) => void
  prefix?: string
}) {
  const patch = (key: keyof ScheduleValues, next: string) => onChange({ ...value, [key]: next })
  return (
    <fieldset className="schedule-fields">
      <legend>{t('plan.title')}</legend>
      <div className="form-row">
        <div className="field">
          <label htmlFor={prefix + '-start'}>{t('plan.start')}</label>
          <DateTimeField
            id={prefix + '-start'}
            className="input"

            value={value.start}
            onChange={(event) => onChange(changeSchedule(value, 'start', event.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor={prefix + '-end'}>{t('plan.end')}</label>
          <DateTimeField
            id={prefix + '-end'}
            className="input"

            value={value.end}
            min={value.start || undefined}
            fallback={value.start}
            onChange={(event) => patch('end', event.target.value)}
          />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor={prefix + '-due'}>{t('task.field.due')}</label>
          <DateTimeField
            id={prefix + '-due'}
            className="input"

            value={value.due}
            onChange={(event) => patch('due', event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor={prefix + '-estimate'}>{t('task.field.estimate')}</label>
          <Input
            id={prefix + '-estimate'}
            className="input"
            type="number"
            min={1}
            max={100000}
            step={1}
            value={value.estimate}
            onChange={(event) => patch('estimate', event.target.value)}
          />
        </div>
      </div>
      <p className="field-hint">{t('plan.hint')}</p>
      <Button
        type="button"
        className="text-button"
        variant="ghost"
        onClick={() => onChange({ ...value, start: '', end: '' })}
      >
        {t('plan.clear')}
      </Button>
    </fieldset>
  )
}
