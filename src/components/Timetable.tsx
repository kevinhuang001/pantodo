import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  addDays,
  addMonths,
  addWeeks,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { intersectsDay, placeDay } from '@/domain/calendar'
import { colorFor } from '@/domain/filters'
import { paletteFor } from '@/domain/palette'
import { toDateInputValue } from '@/domain/date'
import { useAppStore } from '@/domain/store'
import type { CalendarMode, Task, TimetableZoom } from '@/domain/types'
import { getLocale, t } from '@/i18n'
import { Icon } from './Icon'
import { Segmented } from './Menu'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const HEIGHTS: Record<TimetableZoom, number> = { compact: 44, standard: 76, large: 112 }
function clock(iso: string) {
  return new Intl.DateTimeFormat(getLocale(), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}
export function Timetable({
  now,
  theme,
  onEdit,
}: {
  now: Date
  theme: 'light' | 'dark'
  onEdit: (task: Task) => void
}) {
  const tasks = useAppStore((s) => s.tasks),
    projects = useAppStore((s) => s.projects),
    tags = useAppStore((s) => s.tags),
    taskTags = useAppStore((s) => s.taskTags),
    settings = useAppStore((s) => s.settings),
    updateSettings = useAppStore((s) => s.updateSettings)
  const [anchor, setAnchor] = useState(() => new Date(now))
  const scrollRef = useRef<HTMLDivElement>(null),
    scrollHours = useRef(7)
  const mode = settings.calendarMode ?? 'week'
  const hourHeight = settings.calendarHourHeight ?? HEIGHTS[settings.timetableZoom]
  const palette = paletteFor(theme),
    locale = getLocale()
  const visible = useMemo(
    () =>
      tasks.filter((task) => !task.deletedAt && !task.archivedAt && task.status !== 'cancelled'),
    [tasks],
  )
  const week = startOfWeek(anchor, { weekStartsOn: settings.weekStartsOn })
  const monthStart = startOfWeek(startOfMonth(anchor), { weekStartsOn: settings.weekStartsOn })
  const days =
    mode === 'month'
      ? Array.from({ length: 42 }, (_, i) => addDays(monthStart, i))
      : mode === 'agenda'
        ? Array.from({ length: 30 }, (_, i) => addDays(startOfDay(anchor), i))
        : mode === 'day'
          ? [startOfDay(anchor)]
          : Array.from({ length: 7 }, (_, i) => addDays(week, i))
  const gridDays = mode === 'day' ? 1 : 7
  const dueOn = (task: Task, day: Date) => !!task.dueAt && isSameDay(new Date(task.dueAt), day)
  const taskColor = (task: Task) => {
    const project = projects.find((p) => p.id === task.projectId)
    const tag = tags.find((tag) => tag.id === (taskTags[task.id] ?? [])[0])
    return project
      ? colorFor(project, palette)
      : tag
        ? colorFor(tag, palette)
        : (palette[0] ?? '#739063')
  }
  const rangeLabel =
    mode === 'month'
      ? new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(anchor)
      : mode === 'day'
        ? new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }).format(anchor)
        : `${new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(days[0]!)} – ${new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(days[days.length - 1]!)}`
  const navigate = (delta: number) =>
    setAnchor(
      mode === 'month'
        ? addMonths(anchor, delta)
        : mode === 'day'
          ? addDays(anchor, delta)
          : mode === 'agenda'
            ? addDays(anchor, 30 * delta)
            : addWeeks(anchor, delta),
    )
  const chooseMode = (next: CalendarMode) => void updateSettings({ calendarMode: next })
  useEffect(() => {
    const node = scrollRef.current
    if (node) {
      node.scrollTop = scrollHours.current * hourHeight
    }
  }, [hourHeight, mode])
  const [error, setError] = useState(false)
  const updateZoom = (height: number) => {
    setError(false)
    void updateSettings({ calendarHourHeight: height }).catch(() => setError(true))
  }
  const eventsFor = (day: Date) =>
    visible
      .flatMap((task) => {
        const rows: { task: Task; deadline: boolean; at: string }[] = []
        if (intersectsDay(task, day)) rows.push({ task, deadline: false, at: task.startAt! })
        if (dueOn(task, day)) rows.push({ task, deadline: true, at: task.dueAt! })
        return rows
      })
      .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  return (
    <div
      className={'timetable calendar-' + mode}
      style={{ '--tt-days': gridDays, '--hour-height': hourHeight + 'px' } as CSSProperties}
    >
      <div className="tt-nav">
        <button
          className="icon-button"
          type="button"
          aria-label={t('timetable.prev')}
          onClick={() => navigate(-1)}
        >
          <Icon name="chevronLeft" />
        </button>
        <button type="button" className="secondary" onClick={() => setAnchor(new Date())}>
          {t('timetable.today')}
        </button>
        <button
          className="icon-button"
          type="button"
          aria-label={t('timetable.next')}
          onClick={() => navigate(1)}
        >
          <Icon name="chevronRight" />
        </button>
        <span className="tt-range">{rangeLabel}</span>
        <input
          className="calendar-jump"
          type="date"
          aria-label={t('calendar.range')}
          value={toDateInputValue(anchor.toISOString())}
          onChange={(e) => {
            if (e.target.value) setAnchor(new Date(e.target.value + 'T12:00'))
          }}
        />
        <span className="toolbar-spacer" />
        <Segmented
          label={t('calendar.view')}
          value={mode}
          options={(['day', 'week', 'month', 'agenda'] as const).map((key) => ({
            key,
            label: t(('calendar.' + key) as 'calendar.day'),
          }))}
          onChange={(key) => chooseMode(key as CalendarMode)}
        />
      </div>
      <div className="calendar-subbar">
        <p>{t('calendar.legend')}</p>
        <span className="toolbar-spacer" />
        {mode === 'week' || mode === 'day' ? (
          <>
            <Segmented
              label={t('timetable.zoom')}
              value={String(hourHeight)}
              options={(['compact', 'standard', 'large'] as const).map((key) => ({
                key: String(HEIGHTS[key]),
                label: t(('timetable.zoom.' + key) as 'timetable.zoom.compact'),
              }))}
              onChange={(key) => updateZoom(Number(key))}
            />
            <label className="zoom-range">
              <Icon name="search" size={13} />
              <input
                type="range"
                aria-label={t('calendar.zoom')}
                min={36}
                max={144}
                step={4}
                value={hourHeight}
                onChange={(e) => updateZoom(Number(e.target.value))}
              />
              <span>{Math.round((hourHeight / 76) * 100)}%</span>
            </label>
          </>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="form-error">
          {t('work.failed')}
        </p>
      ) : null}
      {mode === 'month' ? (
        <div className="month-calendar">
          <div className="month-weekdays">
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i}>
                {new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(
                  addDays(monthStart, i),
                )}
              </span>
            ))}
          </div>
          <div className="month-days">
            {days.map((day) => {
              const rows = eventsFor(day)
              return (
                <section
                  key={day.toISOString()}
                  className={'month-day' + (!isSameMonth(day, anchor) ? ' outside' : '')}
                >
                  <button
                    className={isSameDay(day, now) ? 'month-date today' : 'month-date'}
                    onClick={() => {
                      setAnchor(day)
                      chooseMode('day')
                    }}
                    aria-label={day.toLocaleDateString(locale)}
                  >
                    {day.getDate()}
                  </button>
                  {rows.slice(0, 3).map((row) => (
                    <button
                      type="button"
                      key={row.task.id + String(row.deadline)}
                      onClick={() => onEdit(row.task)}
                      className={row.deadline ? 'month-event deadline-event' : 'month-event'}
                      title={
                        (row.deadline ? t('calendar.deadline') + ' ' : '') +
                        clock(row.at) +
                        ' ' +
                        row.task.title
                      }
                      style={{ '--event-color': taskColor(row.task) } as CSSProperties}
                    >
                      {row.deadline ? (
                        <span className="deadline-prefix">{t('calendar.deadline')}</span>
                      ) : (
                        <span className="dot" />
                      )}
                      <span className="month-event-time">{clock(row.at)}</span>
                      <span>{row.task.title}</span>
                    </button>
                  ))}
                  {rows.length > 3 ? (
                    <button
                      className="month-more"
                      onClick={() => {
                        setAnchor(day)
                        chooseMode('day')
                      }}
                    >
                      +{rows.length - 3} {t('calendar.more')}
                    </button>
                  ) : null}
                </section>
              )
            })}
          </div>
        </div>
      ) : mode === 'agenda' ? (
        <div className="calendar-agenda">
          {days
            .filter((day) => eventsFor(day).length)
            .map((day) => (
              <section className="agenda-day" key={day.toISOString()}>
                <header>
                  <span>{new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day)}</span>
                  <strong className={isSameDay(day, now) ? 'today' : ''}>{day.getDate()}</strong>
                  <small>{new Intl.DateTimeFormat(locale, { month: 'short' }).format(day)}</small>
                </header>
                <div>
                  {eventsFor(day).map((row) => (
                    <button
                      className={row.deadline ? 'agenda-event deadline-event' : 'agenda-event'}
                      key={row.task.id + String(row.deadline)}
                      onClick={() => onEdit(row.task)}
                      style={{ '--event-color': taskColor(row.task) } as CSSProperties}
                    >
                      <span>
                        {clock(row.at)}
                        {!row.deadline ? ' – ' + clock(row.task.endAt!) : ''}
                      </span>
                      <i />
                      <strong>{row.task.title}</strong>
                      {row.deadline ? <small>{t('calendar.deadline')}</small> : null}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          {!days.some((day) => eventsFor(day).length) ? (
            <p className="stats-empty">{t('calendar.empty')}</p>
          ) : null}
        </div>
      ) : (
        <>
          <div className="tt-head-row">
            <div className="tt-gutter">
              <small>{Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop()}</small>
            </div>
            <div className="tt-head-days">
              {days.map((day) => (
                <button
                  type="button"
                  key={day.toISOString()}
                  className={isSameDay(day, now) ? 'tt-day-head today' : 'tt-day-head'}
                  onClick={() => {
                    setAnchor(day)
                    chooseMode('day')
                  }}
                >
                  <span className="tt-weekday">
                    {new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day)}
                  </span>
                  <span className="tt-date">{day.getDate()}</span>
                </button>
              ))}
            </div>
          </div>
          <div
            className="tt-scroll"
            ref={scrollRef}
            onScroll={(event) => {
              scrollHours.current = event.currentTarget.scrollTop / hourHeight
            }}
          >
            <div className="tt-body" style={{ height: 24 * hourHeight }}>
              <div className="tt-hours">
                {HOURS.map((hour) => (
                  <div className="tt-hour" key={hour} style={{ height: hourHeight }}>
                    <span>{String(hour).padStart(2, '0')}:00</span>
                  </div>
                ))}
              </div>
              <div className="tt-columns">
                {days.map((day) => {
                  const placements = placeDay(visible, day)
                  const deadlines = visible
                    .filter((task) => dueOn(task, day))
                    .sort((a, b) => Date.parse(a.dueAt!) - Date.parse(b.dueAt!))
                  const dueMinutes = [
                    ...new Set(
                      deadlines.map((task) => {
                        const d = new Date(task.dueAt!)
                        return d.getHours() * 60 + d.getMinutes()
                      }),
                    ),
                  ]
                  return (
                    <div className="tt-column" key={day.toISOString()}>
                      {HOURS.map((hour) => (
                        <div className="tt-slot" key={hour} style={{ height: hourHeight }} />
                      ))}
                      {placements.map((item) => (
                        <button
                          type="button"
                          className={
                            'tt-block' +
                            (item.task.status === 'done' ? ' completed' : '') +
                            (item.end - item.start < 30 ? ' short' : '')
                          }
                          key={item.task.id}
                          data-todo-id={item.task.id}
                          onClick={() => onEdit(item.task)}
                          title={
                            item.task.title +
                            ' · ' +
                            clock(item.task.startAt!) +
                            '–' +
                            clock(item.task.endAt!)
                          }
                          style={{
                            top: (item.start / 60) * hourHeight,
                            height: Math.max(((item.end - item.start) / 60) * hourHeight, 17),
                            left: `calc(${(item.lane / item.lanes) * 100}% + 2px)`,
                            width: `calc(${100 / item.lanes}% - 5px)`,
                            borderLeftColor: taskColor(item.task),
                            background: `color-mix(in srgb, ${taskColor(item.task)} 19%, var(--surface-strong))`,
                          }}
                        >
                          <span className="tt-block-title">{item.task.title}</span>
                          <span className="tt-block-time">
                            {clock(item.task.startAt!)}–{clock(item.task.endAt!)}
                          </span>
                        </button>
                      ))}
                      {dueMinutes.map((minute) => (
                        <div
                          className="tt-deadline"
                          key={minute}
                          style={{ top: (minute / 60) * hourHeight }}
                        >
                          <span className="deadline-dot" />
                          <div className="deadline-labels">
                            {deadlines
                              .filter((task) => {
                                const d = new Date(task.dueAt!)
                                return d.getHours() * 60 + d.getMinutes() === minute
                              })
                              .map((task) => (
                                <button
                                  type="button"
                                  className={
                                    task.status === 'done'
                                      ? 'deadline-label completed'
                                      : 'deadline-label'
                                  }
                                  key={task.id}
                                  title={
                                    t('calendar.deadline') +
                                    ' ' +
                                    clock(task.dueAt!) +
                                    ' · ' +
                                    task.title
                                  }
                                  onClick={() => onEdit(task)}
                                >
                                  {clock(task.dueAt!)} · {task.title}
                                </button>
                              ))}
                          </div>
                        </div>
                      ))}
                      {isSameDay(day, now) ? (
                        <div
                          className="tt-now"
                          style={{ top: (now.getHours() + now.getMinutes() / 60) * hourHeight }}
                          aria-hidden="true"
                        />
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
