import { addMinutes } from 'date-fns'
import { toLocalInputValue } from './date'
export interface ScheduleValues {
  start: string
  end: string
  due: string
  estimate: string
}
export type ScheduleEndpoint = 'start' | 'end' | 'due'
/** Keep existing custom intervals; new plans default to thirty minutes. */
export function scheduleDuration(value: ScheduleValues): number {
  const interval =
    value.start && value.end ? (Date.parse(value.end) - Date.parse(value.start)) / 60000 : 0
  return interval > 0 ? interval : Number(value.estimate) || 30
}
export function changeDuration(value: ScheduleValues, minutes: string): ScheduleValues {
  const duration = Number(minutes)
  if (!Number.isFinite(duration) || duration < 1 || duration > 100000) return value
  return {
    ...value,
    estimate: minutes,
    end: value.start
      ? toLocalInputValue(addMinutes(new Date(value.start), duration).toISOString())
      : '',
  }
}
export function changeSchedule(
  value: ScheduleValues,
  endpoint: ScheduleEndpoint,
  next: string,
): ScheduleValues {
  if (endpoint === 'due') return { ...value, due: next }
  if (!next) return { ...value, start: '', end: '' }
  if (endpoint === 'end') return { ...value, end: next }
  const duration = scheduleDuration(value)
  return {
    ...value,
    start: next,
    end: toLocalInputValue(addMinutes(new Date(next), duration).toISOString()),
  }
}
