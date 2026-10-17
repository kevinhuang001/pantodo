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

export interface TimelinePlacement extends CalendarPlacement {
  deadline: boolean
}
/** Deadlines share overlap lanes with plans so neither can cover the other. */
export function placeTimeline(tasks: Task[], day: Date, minimumMinutes = 24): TimelinePlacement[] {
  const plans: TimelinePlacement[] = placeDay(tasks, day).map((item) => ({
    ...item,
    deadline: false,
    end: Math.max(item.end, item.start + minimumMinutes),
  }))
  const due: TimelinePlacement[] = tasks
    .filter(
      (task) =>
        !task.deletedAt &&
        !task.archivedAt &&
        task.status !== 'cancelled' &&
        task.dueAt &&
        startOfDay(new Date(task.dueAt)).getTime() === startOfDay(day).getTime(),
    )
    .map((task) => {
      const date = new Date(task.dueAt!)
      const start = date.getHours() * 60 + date.getMinutes()
      return { task, deadline: true, start, end: start + minimumMinutes, lane: 0, lanes: 1 }
    })
  const items = [...plans, ...due].sort(
    (a, b) => a.start - b.start || Number(a.deadline) - Number(b.deadline),
  )
  let cluster: TimelinePlacement[] = [],
    laneEnds: number[] = [],
    clusterEnd = -1
  const commit = () => {
    for (const item of cluster) item.lanes = laneEnds.length
    cluster = []
    laneEnds = []
    clusterEnd = -1
  }
  for (const item of items) {
    if (item.start >= clusterEnd) commit()
    let lane = laneEnds.findIndex((end) => end <= item.start)
    if (lane < 0) lane = laneEnds.length
    item.lane = lane
    laneEnds[lane] = item.end
    cluster.push(item)
    clusterEnd = Math.max(clusterEnd, item.end)
  }
  commit()
  return items
}
