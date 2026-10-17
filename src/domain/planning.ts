import { addMinutes } from 'date-fns'
import { toLocalInputValue } from './date'
export interface ScheduleValues {
  start: string
  end: string
  due: string
  estimate: string
}
export type ScheduleEndpoint = 'start' | 'end' | 'due'
/** Moving a plan's start keeps its duration; selecting either endpoint creates a complete interval. */
export function changeSchedule(
  value: ScheduleValues,
  endpoint: ScheduleEndpoint,
  next: string,
  defaultMinutes: number,
): ScheduleValues {
  if (endpoint === 'due') return { ...value, due: next }
  if (!next) return { ...value, start: '', end: '' }
  if (endpoint === 'end')
    return {
      ...value,
      end: next,
      start:
        value.start || toLocalInputValue(addMinutes(new Date(next), -defaultMinutes).toISOString()),
    }
  const duration =
    value.start && value.end ? (Date.parse(value.end) - Date.parse(value.start)) / 60000 : 0
  return {
    ...value,
    start: next,
    end: toLocalInputValue(
      addMinutes(new Date(next), duration > 0 ? duration : defaultMinutes).toISOString(),
    ),
  }
}
