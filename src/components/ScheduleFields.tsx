import { DateTimeField } from './DateTimeField'
import { CaptureEstimatePicker } from './CaptureEstimatePicker'
import { Button } from './ui/button'
import { getLocale, t } from '@/i18n'
import { formatDateTime, fromLocalInputValue } from '@/domain/date'
import {
  changeDuration,
  changeSchedule,
  scheduleDuration,
  type ScheduleValues,
} from '@/domain/planning'
export function ScheduleFields({
  value,
  onChange,
  prefix = 'task',
}: {
  value: ScheduleValues
  onChange: (value: ScheduleValues) => void
  prefix?: string
}) {
  return (
    <fieldset className="schedule-fields">
      <legend>{t('plan.title')}</legend>
      <div className="field">
        <label htmlFor={prefix + '-start'}>{t('plan.start')}</label>
        <DateTimeField
          id={prefix + '-start'}
          value={value.start}
          onChange={(next) => onChange(changeSchedule(value, 'start', next))}
        />
      </div>
      <div className="schedule-duration-row">
        <span>{t('plan.duration')}</span>
        <CaptureEstimatePicker
          value={String(scheduleDuration(value))}
          onChange={(next) => onChange(changeDuration(value, next))}
        />
      </div>
      {value.end ? (
        <div className="schedule-result">
          <span>{t('plan.end')}</span>
          <output>{formatDateTime(fromLocalInputValue(value.end), getLocale())}</output>
        </div>
      ) : null}
      <div className="field schedule-due-field">
        <label htmlFor={prefix + '-due'}>{t('task.field.due')}</label>
        <DateTimeField
          id={prefix + '-due'}
          value={value.due}
          onChange={(next) => onChange(changeSchedule(value, 'due', next))}
        />
      </div>
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
