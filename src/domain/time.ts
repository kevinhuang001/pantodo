import { newId } from './ids'
import type { Task, TimeEntry, TimerSession, Workspace } from './types'

export const HEARTBEAT_GAP_MS = 30_000
export type TimeCommand =
  | { kind: 'start'; taskId: string }
  | { kind: 'pause' | 'resume' | 'stop' | 'heartbeat' }
  | { kind: 'save'; entry: TimeEntry }
  | { kind: 'delete'; id: string }
export interface TimeState {
  timeEntries: TimeEntry[]
  timer: TimerSession | null
  tasks: Task[]
}
export function durationSeconds(start: string, end: string): number {
  return Math.max(0, (Date.parse(end) - Date.parse(start)) / 1000)
}
export function elapsedSeconds(timer: TimerSession | null, now: Date): number {
  return timer
    ? timer.elapsedSeconds +
        (timer.startedAt ? durationSeconds(timer.startedAt, now.toISOString()) : 0)
    : 0
}
export function clockLabel(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds))
  return [Math.floor(whole / 3600), Math.floor(whole / 60) % 60, whole % 60]
    .map((n) => String(n).padStart(2, '0'))
    .join(':')
}
export function validateRange(start: string, end: string): void {
  if (
    !Number.isFinite(Date.parse(start)) ||
    !Number.isFinite(Date.parse(end)) ||
    Date.parse(end) <= Date.parse(start)
  )
    throw new Error('time.invalidRange')
}
export function overlaps(
  a: { startedAt: string; endedAt: string },
  b: { startedAt: string; endedAt: string },
): boolean {
  return (
    Date.parse(a.startedAt) < Date.parse(b.endedAt) &&
    Date.parse(b.startedAt) < Date.parse(a.endedAt)
  )
}

/** Saves a new entry and tombstones every whole overlapping entry, atomically. */
export function replaceOverlapping(
  entries: TimeEntry[],
  next: TimeEntry,
  stamp: string,
): TimeEntry[] {
  return [
    ...entries
      .filter((item) => item.id !== next.id)
      .map((item) =>
        !item.deletedAt && overlaps(item, next)
          ? { ...item, deletedAt: stamp, updatedAt: stamp, supersededBy: next.id }
          : item,
      ),
    next,
  ]
}

export function applyTimeCommand(
  workspace: Workspace,
  command: TimeCommand,
  now = new Date(),
  ownerId = 'default',
): TimeState {
  let entries = [...workspace.timeEntries]
  let timer = workspace.timer ? { ...workspace.timer } : null
  let tasks = [...workspace.tasks]
  const stamp = now.toISOString()
  const flush = (end = stamp): void => {
    if (!timer?.startedAt) return
    const seconds = durationSeconds(timer.startedAt, end)
    const entryId = newId()
    if (seconds > 0)
      entries.push({
        id: entryId,
        taskId: timer.taskId,
        startedAt: timer.startedAt,
        endedAt: end,
        source: 'timer',
        note: '',
        createdAt: stamp,
        updatedAt: stamp,
        deletedAt: null,
      })
    timer = {
      ...timer,
      elapsedSeconds: timer.elapsedSeconds + seconds,
      entryIds: [...(timer.entryIds ?? []), ...(seconds > 0 ? [entryId] : [])],
      startedAt: null,
      lastHeartbeatAt: end,
    }
  }
  // Sleep, process crash, and stale owners must never count offline time.
  if (timer?.startedAt && now.getTime() - Date.parse(timer.lastHeartbeatAt) > HEARTBEAT_GAP_MS) {
    flush(timer.lastHeartbeatAt)
    timer = null
  }
  if (command.kind === 'start') {
    const task = tasks.find(
      (item) =>
        item.id === command.taskId &&
        !item.deletedAt &&
        !item.archivedAt &&
        item.status !== 'done' &&
        item.status !== 'cancelled',
    )
    if (!task) throw new Error('time.unavailableTask')
    if (timer?.taskId === task.id && timer.startedAt) return { timeEntries: entries, timer, tasks }
    if (timer?.taskId === task.id)
      timer = { ...timer, startedAt: stamp, lastHeartbeatAt: stamp, ownerId }
    else {
      flush()
      timer = {
        taskId: task.id,
        startedAt: stamp,
        elapsedSeconds: 0,
        entryIds: [],
        ownerId,
        lastHeartbeatAt: stamp,
      }
    }
    tasks = tasks.map((item) =>
      item.id === task.id
        ? { ...item, status: 'doing', completedAt: null, updatedAt: stamp }
        : item,
    )
  } else if (command.kind === 'pause') flush()
  else if (command.kind === 'resume') {
    if (timer && !timer.startedAt) {
      if (
        !tasks.some(
          (item) =>
            item.id === timer?.taskId &&
            !item.deletedAt &&
            !item.archivedAt &&
            item.status !== 'done' &&
            item.status !== 'cancelled',
        )
      )
        throw new Error('time.unavailableTask')
      timer = { ...timer, startedAt: stamp, lastHeartbeatAt: stamp, ownerId }
    }
  } else if (command.kind === 'stop') {
    flush()
    timer = null
  } else if (command.kind === 'heartbeat') {
    if (timer?.ownerId === ownerId) timer.lastHeartbeatAt = stamp
  } else if (command.kind === 'save') {
    validateRange(command.entry.startedAt, command.entry.endedAt)
    if (Date.parse(command.entry.endedAt) > now.getTime()) throw new Error('time.future')
    if (
      command.entry.taskId &&
      !tasks.some((task) => task.id === command.entry.taskId && !task.deletedAt)
    )
      throw new Error('time.unavailableTask')
    if (
      timer &&
      ((timer.startedAt &&
        overlaps({ startedAt: timer.startedAt, endedAt: stamp }, command.entry)) ||
        entries.some(
          (entry) =>
            (timer?.entryIds ?? []).includes(entry.id) &&
            (entry.id === command.entry.id || overlaps(entry, command.entry)),
        ))
    ) {
      flush()
      timer = null
    }
    const current = entries.find((entry) => entry.id === command.entry.id)
    const next = {
      ...command.entry,
      source: 'manual' as const,
      createdAt: current?.createdAt ?? stamp,
      updatedAt: stamp,
      deletedAt: null,
      supersededBy: undefined,
    }
    entries = replaceOverlapping(entries, next, stamp)
  } else if (command.kind === 'delete') {
    if ((timer?.entryIds ?? []).includes(command.id)) {
      flush()
      timer = null
    }
    entries = entries.map((entry) =>
      entry.id === command.id ? { ...entry, deletedAt: stamp, updatedAt: stamp } : entry,
    )
  }
  return { timeEntries: entries, timer, tasks }
}
export function clippedSeconds(
  entry: Pick<TimeEntry, 'startedAt' | 'endedAt'>,
  start: Date,
  end: Date,
): number {
  return (
    Math.max(
      0,
      Math.min(Date.parse(entry.endedAt), end.getTime()) -
        Math.max(Date.parse(entry.startedAt), start.getTime()),
    ) / 1000
  )
}
export function dailySeconds(
  entries: Pick<TimeEntry, 'startedAt' | 'endedAt'>[],
  start: Date,
  end: Date,
): { day: Date; seconds: number }[] {
  const result: { day: Date; seconds: number }[] = []
  const day = new Date(start)
  day.setHours(0, 0, 0, 0)
  while (day < end) {
    const next = new Date(day)
    next.setDate(next.getDate() + 1)
    result.push({
      day: new Date(day),
      seconds: entries.reduce(
        (sum, entry) =>
          sum +
          clippedSeconds(
            entry,
            new Date(Math.max(start.getTime(), day.getTime())),
            new Date(Math.min(end.getTime(), next.getTime())),
          ),
        0,
      ),
    })
    day.setDate(day.getDate() + 1)
  }
  return result
}
