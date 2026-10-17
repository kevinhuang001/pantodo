import { addDays, startOfDay } from 'date-fns'
import type { Task } from './types'
import { validateRange } from './time'

export function validatePlan(startAt: string | null, endAt: string | null): void {
  if (startAt === null && endAt === null) return
  if (!startAt || !endAt) throw new Error('time.invalidRange')
  validateRange(startAt, endAt)
}
export interface CalendarPlacement {
  task: Task
  start: number
  end: number
  lane: number
  lanes: number
}
export function intersectsDay(task: Task, day: Date): boolean {
  const from = startOfDay(day)
  return (
    !!task.startAt &&
    !!task.endAt &&
    new Date(task.startAt) < addDays(from, 1) &&
    new Date(task.endAt) > from
  )
}
/** Clip cross-midnight plans and pack each overlap cluster into its own lanes. */
export function placeDay(tasks: Task[], day: Date): CalendarPlacement[] {
  const from = startOfDay(day).getTime()
  const to = addDays(startOfDay(day), 1).getTime()
  const items = tasks
    .filter((task) => !task.deletedAt && !task.archivedAt && intersectsDay(task, day))
    .map((task) => {
      const start = new Date(Math.max(from, Date.parse(task.startAt!)))
      const end = new Date(Math.min(to, Date.parse(task.endAt!)))
      return {
        task,
        start: start.getHours() * 60 + start.getMinutes(),
        end: end.getTime() === to ? 1440 : end.getHours() * 60 + end.getMinutes(),
        lane: 0,
        lanes: 1,
      }
    })
    .sort((a, b) => a.start - b.start || b.end - a.end)
  let cluster: CalendarPlacement[] = []
  let clusterEnd = -1
  let laneEnds: number[] = []
  const commit = (): void => {
    for (const item of cluster) item.lanes = laneEnds.length
    cluster = []
    laneEnds = []
    clusterEnd = -1
  }
  for (const item of items) {
    if (item.start >= clusterEnd) commit()
    let lane = laneEnds.findIndex((end) => end <= item.start)
    if (lane < 0) lane = laneEnds.length
    laneEnds[lane] = item.end
    item.lane = lane
    cluster.push(item)
    clusterEnd = Math.max(clusterEnd, item.end)
  }
  commit()
  return items
}
