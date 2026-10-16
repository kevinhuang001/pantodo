import { useEffect, useMemo, useRef, useState } from 'react'

import {
  addDays,
  addWeeks,
  differenceInMinutes,
  isSameDay,
  startOfDay,
  startOfWeek,
} from 'date-fns'

import { colorFor } from '@/domain/filters'
import { paletteFor } from '@/domain/palette'
import { useAppStore } from '@/domain/store'
import type { ScheduleBlock, Task, TimetableZoom } from '@/domain/types'
import { getLocale, t } from '@/i18n'

import { Icon } from './Icon'
import { Segmented } from './Menu'

/** Row heights per zoom level; "large" is the default so a 30-minute block still shows its text. */
const ZOOM_HEIGHTS: Record<TimetableZoom, number> = { compact: 44, standard: 76, large: 112 }
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
/** Lanes are packed in this granularity, matching the agreed 15-minute snap. */
const MIN_BLOCK_MINUTES = 15

interface PlacedBlock {
  block: ScheduleBlock
  task: Task
  top: number
  height: number
  lane: number
  lanes: number
  color: string
}

interface DayColumn {
  key: string
  items: PlacedBlock[]
  due: Task[]
}

interface TimetableProps {
  now: Date
  theme: 'light' | 'dark'
}

function timeLabel(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(
    new Date(value),
  )
}

/**
 * A Google-Calendar-style week grid: seven day columns over a scrollable 24-hour canvas, with
 * scheduled blocks positioned by time, overlaps packed side by side, an all-day row, a red
 * now-line and week navigation. Read-only for M1; M2 adds create/move/resize on the grid.
 */
export function Timetable({ now, theme }: TimetableProps) {
  const scheduleBlocks = useAppStore((state) => state.scheduleBlocks)
  const tasks = useAppStore((state) => state.tasks)
  const projects = useAppStore((state) => state.projects)
  const tags = useAppStore((state) => state.tags)
  const taskTags = useAppStore((state) => state.taskTags)
  const weekStartsOn = useAppStore((state) => state.settings.weekStartsOn)
  const zoom = useAppStore((state) => state.settings.timetableZoom) ?? 'large'
  const updateSettings = useAppStore((state) => state.updateSettings)
  const hourHeight = ZOOM_HEIGHTS[zoom]

  const [anchor, setAnchor] = useState<Date>(() => new Date(now))
  const scrollRef = useRef<HTMLDivElement>(null)
  const locale = getLocale()
  const palette = paletteFor(theme)

  const weekStart = useMemo(
    () => startOfWeek(anchor, { weekStartsOn: weekStartsOn === 0 ? 0 : 1 }),
    [anchor, weekStartsOn],
  )
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  )

  const columns = useMemo<DayColumn[]>(() => {
    const byId = new Map(tasks.map((task) => [task.id, task]))
    const projectsById = new Map(projects.map((project) => [project.id, project]))
    const tagsById = new Map(tags.map((tag) => [tag.id, tag]))

    const colorForTask = (task: Task): string => {
      const project = task.projectId === null ? undefined : projectsById.get(task.projectId)
      if (project !== undefined) return colorFor(project, palette)
      const firstTagId = (taskTags[task.id] ?? [])[0]
      const tag = firstTagId === undefined ? undefined : tagsById.get(firstTagId)
      return tag === undefined ? (palette[0] ?? '#2d6d95') : colorFor(tag, palette)
    }

    return days.map((day) => {
      const dayStart = startOfDay(day)
      const entries = scheduleBlocks
        .filter((block) => block.deletedAt === null && isSameDay(new Date(block.startAt), day))
        .map((block) => ({ block, task: byId.get(block.taskId) }))
        .filter(
          (entry): entry is { block: ScheduleBlock; task: Task } =>
            entry.task !== undefined && entry.task.deletedAt === null,
        )
        .sort((a, b) => new Date(a.block.startAt).getTime() - new Date(b.block.startAt).getTime())

      const laneEnds: number[] = []
      const items = entries.map<PlacedBlock>(({ block, task }) => {
        const startMin = differenceInMinutes(new Date(block.startAt), dayStart)
        const endMin = Math.max(
          differenceInMinutes(new Date(block.endAt), dayStart),
          startMin + MIN_BLOCK_MINUTES,
        )
        let lane = laneEnds.findIndex((end) => end <= startMin)
        if (lane === -1) {
          laneEnds.push(endMin)
          lane = laneEnds.length - 1
        } else {
          laneEnds[lane] = endMin
        }
        return {
          block,
          task,
          top: (startMin / 60) * hourHeight,
          height: Math.max(((endMin - startMin) / 60) * hourHeight, 18),
          lane,
          lanes: 1,
          color: colorForTask(task),
        }
      })

      const lanes = Math.max(laneEnds.length, 1)
      return {
        key: day.toISOString(),
        items: items.map((item) => ({ ...item, lanes })),
        due: tasks.filter(
          (task) =>
            task.deletedAt === null &&
            task.dueAt !== null &&
            isSameDay(new Date(task.dueAt), day) &&
            task.status !== 'done' &&
            task.status !== 'cancelled',
        ),
      }
    })
  }, [days, scheduleBlocks, tasks, projects, tags, taskTags, palette, hourHeight])

  useEffect(() => {
    const node = scrollRef.current
    if (node !== null) node.scrollTop = 7 * hourHeight
  }, [hourHeight])

  const todayIndex = days.findIndex((day) => isSameDay(day, now))
  const nowTop = (differenceInMinutes(now, startOfDay(now)) / 60) * hourHeight
  const hasBlocks = columns.some((column) => column.items.length > 0)

  const rangeLabel = `${new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(weekStart)} – ${new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(addDays(weekStart, 6))}`

  return (
    <div className="timetable">
      <div className="tt-nav">
        <button
          type="button"
          className="icon-button"
          aria-label={t('timetable.prev')}
          title={t('timetable.prev')}
          onClick={() => setAnchor(addWeeks(anchor, -1))}
        >
          <Icon name="chevronLeft" />
        </button>
        <button type="button" className="secondary" onClick={() => setAnchor(new Date())}>
          {t('timetable.today')}
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label={t('timetable.next')}
          title={t('timetable.next')}
          onClick={() => setAnchor(addWeeks(anchor, 1))}
        >
          <Icon name="chevronRight" />
        </button>
        <span className="tt-range">{rangeLabel}</span>
        <span className="toolbar-spacer" />
        {hasBlocks ? null : <span className="count">{t('timetable.empty')}</span>}
        <Segmented
          label={t('timetable.zoom')}
          value={zoom}
          options={[
            { key: 'compact', label: t('timetable.zoom.compact') },
            { key: 'standard', label: t('timetable.zoom.standard') },
            { key: 'large', label: t('timetable.zoom.large') },
          ]}
          onChange={(key) => void updateSettings({ timetableZoom: key as TimetableZoom })}
        />
      </div>

      <div className="tt-head-row">
        <div className="tt-gutter" />
        <div className="tt-head-days">
          {days.map((day, index) => (
            <div
              className={index === todayIndex ? 'tt-day-head today' : 'tt-day-head'}
              key={day.toISOString()}
            >
              <span className="tt-weekday">
                {new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day)}
              </span>
              <span className="tt-date">
                {new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(day)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="tt-allday-row">
        <div className="tt-gutter">{t('timetable.allDay')}</div>
        <div className="tt-allday-cells">
          {columns.map((column) => (
            <div className="tt-allday-cell" key={column.key}>
              {column.due.map((task) => (
                <span className="tt-allday-chip" key={task.id}>
                  {task.title}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="tt-scroll" ref={scrollRef}>
        <div className="tt-body" style={{ height: 24 * hourHeight }}>
          <div className="tt-hours">
            {HOURS.map((hour) => (
              <div className="tt-hour" key={hour} style={{ height: hourHeight }}>
                <span>{String(hour).padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>
          <div className="tt-columns">
            {columns.map((column, dayIndex) => (
              <div className="tt-column" key={column.key}>
                {HOURS.map((hour) => (
                  <div className="tt-slot" key={hour} style={{ height: hourHeight }} />
                ))}
                {dayIndex === todayIndex ? (
                  <div className="tt-now" style={{ top: nowTop }} aria-hidden="true" />
                ) : null}
                {column.items.map((item) => (
                  <article
                    className="tt-block"
                    key={item.block.id}
                    style={{
                      top: item.top,
                      height: item.height,
                      left: `${(item.lane / item.lanes) * 100}%`,
                      width: `${100 / item.lanes}%`,
                      borderLeftColor: item.color,
                      background: `${item.color}1f`,
                    }}
                  >
                    <span className="tt-block-time">
                      {timeLabel(item.block.startAt, locale)}–{timeLabel(item.block.endAt, locale)}
                    </span>
                    <span className="tt-block-title">{item.task.title}</span>
                  </article>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
