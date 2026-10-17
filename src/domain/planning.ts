import { addMinutes } from 'date-fns'
import { toLocalInputValue } from './date'
export interface ScheduleValues {
  start: string
  end: string
  due: string
  estimate: string
}
export type ScheduleEndpoint = 'start' | 'end' | 'due'
/** Endpoints are explicit; moving an existing block preserves its duration. */
export function changeSchedule(
  value: ScheduleValues,
  endpoint: ScheduleEndpoint,
  next: string,
): ScheduleValues {
  if (endpoint === 'due') return { ...value, due: next }
  if (!next) return { ...value, start: '', end: '' }
  if (endpoint === 'end') return { ...value, end: next }
  const duration =
    value.start && value.end ? (Date.parse(value.end) - Date.parse(value.start)) / 60000 : 0
  return {
    ...value,
    start: next,
    end:
      duration > 0
        ? toLocalInputValue(addMinutes(new Date(next), duration).toISOString())
        : value.end,
  }
}
