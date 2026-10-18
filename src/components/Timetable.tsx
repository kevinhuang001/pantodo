import { expandTasks, dateKey } from '@/domain/recurrence'
import { Flag } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip'
import { useCalendarZoom } from '@/useCalendarZoom'
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  addDays,
  addMonths,
  addWeeks,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
} from 'date-fns'
import { intersectsDay, placeTimeline } from '@/domain/calendar'
import { colorFor } from '@/domain/filters'
import { paletteFor } from '@/domain/palette'
import { useAppStore } from '@/domain/store'
import type { CalendarMode, Task } from '@/domain/types'
import { getLocale, t } from '@/i18n'
import { Icon } from './Icon'
import { Button } from './ui/button'
import { Slider } from './ui/slider'
import { Calendar } from './ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { enUS, zhCN, ja } from 'date-fns/locale'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
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
    tags = useAppStore((s) => s.tags),
    taskTags = useAppStore((s) => s.taskTags),
    settings = useAppStore((s) => s.settings),
    updateSettings = useAppStore((s) => s.updateSettings)
  const [anchor, setAnchor] = useState(() => new Date(now))
  const scrollRef = useRef<HTMLDivElement>(null),
    scrollHours = useRef(7)
  const mode = settings.calendarMode ?? 'week'
  const [hourHeight, setHourHeight] = useState(settings.calendarHourHeight ?? 76)
  const headRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    const sync = () =>
      headRef.current?.style.setProperty(
        '--tt-scrollbar',
        node.offsetWidth - node.clientWidth + 'px',
      )
    const observer = new ResizeObserver(sync)
    observer.observe(node)
    sync()
    return () => observer.disconnect()
  }, [mode])
  const [dateOpen, setDateOpen] = useState(false)
  useEffect(() => setHourHeight(settings.calendarHourHeight ?? 76), [settings.calendarHourHeight])
  const palette = paletteFor(theme),
    locale = getLocale()
  const week = startOfWeek(anchor, { weekStartsOn: settings.weekStartsOn })
  const monthStart = startOfWeek(startOfMonth(anchor), { weekStartsOn: settings.weekStartsOn })
  const days =
    mode === 'month'
      ? Array.from({ length: 42 }, (_, i) => addDays(monthStart, i))
      : mode === 'day'
        ? [startOfDay(anchor)]
        : Array.from({ length: 7 }, (_, i) => addDays(week, i))
  const gridDays = mode === 'day' ? 1 : 7
  const rangeStart = days[0]!.getTime(),
    rangeEnd = addDays(days[days.length - 1]!, 1).getTime()
  const visible = useMemo(
    () =>
      expandTasks(
        tasks.filter((task) => !task.deletedAt && !task.archivedAt && task.status !== 'cancelled'),
        new Date(rangeStart),
        new Date(rangeEnd),
      ).filter((task) => task.status !== 'cancelled'),
    [tasks, rangeStart, rangeEnd],
  )
  const untimedOn = (day: Date) =>
    visible.filter((t) => !t.startAt && !t.dueAt && t.occurrenceKey === dateKey(day))
  const dueOn = (task: Task, day: Date) => !!task.dueAt && isSameDay(new Date(task.dueAt), day)
  const taskColor = (task: Task) => {
    const tag = tags.find((tag) => tag.id === (taskTags[task.id] ?? [])[0])
    return tag ? colorFor(tag, palette) : 'var(--accent)'
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
        : new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).formatRange(
            days[0]!,
            days[days.length - 1]!,
          )
  const navigate = (delta: number) =>
    setAnchor(
      mode === 'month'
        ? addMonths(anchor, delta)
        : mode === 'day'
          ? addDays(anchor, delta)
          : addWeeks(anchor, delta),
    )
  const chooseMode = (next: CalendarMode) => void updateSettings({ calendarMode: next })
  const restoreScroll = useEffectEvent(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = scrollHours.current * hourHeight
  })
  useEffect(() => restoreScroll(), [mode])
  const [error, setError] = useState(false)
  const updateZoom = (height: number) => {
    setError(false)
    void updateSettings({ calendarHourHeight: height }).catch(() => setError(true))
  }
  useCalendarZoom(scrollRef, hourHeight, setHourHeight, updateZoom, mode !== 'month')
  const eventsFor = (day: Date) =>
    visible
      .flatMap((task) => {
        const rows: { task: Task; deadline: boolean; at: string }[] = []
        if (intersectsDay(task, day)) rows.push({ task, deadline: false, at: task.startAt! })
        if (dueOn(task, day)) rows.push({ task, deadline: true, at: task.dueAt! })
        if (!task.startAt && !task.dueAt && task.occurrenceKey === dateKey(day))
          rows.push({ task, deadline: false, at: day.toISOString() })
        return rows
      })
      .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  return (
    <div
      className={'timetable calendar-' + mode}
      style={{ '--tt-days': gridDays, '--hour-height': hourHeight + 'px' } as CSSProperties}
    >
      <div className="calendar-controls">
        <div className="calendar-navigation">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('timetable.prev')}
            onClick={() => navigate(-1)}
          >
            <Icon name="chevronLeft" size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('timetable.next')}
            onClick={() => navigate(1)}
          >
            <Icon name="chevronRight" size={14} />
          </Button>
        </div>
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="calendar-range"
              aria-label={t('calendar.range')}
            >
              {rangeLabel}
              <Icon name="chevronDown" size={12} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="date-popover" align="start">
            <Calendar
              mode="range"
              weekStartsOn={settings.weekStartsOn}
              selected={{
                from: mode === 'month' ? startOfMonth(anchor) : days[0],
                to: mode === 'month' ? endOfMonth(anchor) : days[days.length - 1],
              }}
              defaultMonth={anchor}
              locale={{ 'zh-CN': zhCN, en: enUS, ja }[locale]}
              onDayClick={(date) => {
                if (date) {
                  setAnchor(date)
                  setDateOpen(false)
                }
              }}
            />
          </PopoverContent>
        </Popover>
        <span className="toolbar-spacer" />
        <TooltipProvider delayDuration={250} disableHoverableContent>
          <div className="calendar-mode" role="group" aria-label={t('calendar.view')}>
            {(['day', 'week', 'month'] as const).map((key) => (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-pressed={mode === key}
                    onClick={() => chooseMode(key)}
                  >
                    {t(('calendar.' + key) as 'calendar.day')}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={7}>
                  {t(('calendar.tooltip.' + key) as 'calendar.tooltip.day')}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
        {mode !== 'month' ? (
          <div className="calendar-zoom" title={t('calendar.zoom')}>
            <Icon name="search" size={13} />
            <Slider
              aria-label={t('calendar.zoom')}
              min={36}
              max={144}
              step={4}
              value={[hourHeight]}
              onValueChange={([height]) => setHourHeight(height!)}
              onValueCommit={([height]) => updateZoom(height!)}
            />
          </div>
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
                      key={row.task.id + row.task.occurrenceKey + String(row.deadline)}
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
                        <span className="deadline-prefix">
                          <Flag size={11} />
                          {t('calendar.deadline')}
                        </span>
                      ) : (
                        <span className="dot" />
                      )}
                      <span className="month-event-time">
                        {!row.task.startAt && !row.task.dueAt ? t('repeat.allDay') : clock(row.at)}
                      </span>
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
      ) : (
        <>
          <div className="tt-head-row" ref={headRef}>
            <div className="tt-gutter">
              <small>
                {
                  new Intl.DateTimeFormat('en', { timeZoneName: 'shortOffset' })
                    .formatToParts(now)
                    .find((p) => p.type === 'timeZoneName')?.value
                }
              </small>
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
          {days.some((day) => untimedOn(day).length) ? (
            <div className="tt-allday-row">
              <span>{t('repeat.allDay')}</span>
              <div className="tt-allday-days">
                {days.map((day) => (
                  <div key={dateKey(day)}>
                    {untimedOn(day).map((task) => (
                      <button
                        type="button"
                        key={task.id + (task.occurrenceKey ?? '')}
                        onClick={() => onEdit(task)}
                      >
                        {task.title}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
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
                  const placements = placeTimeline(
                    visible,
                    day,
                    Math.max(20, (27 / hourHeight) * 60),
                  )
                  return (
                    <div className="tt-column" data-day={day.toISOString()} key={day.toISOString()}>
                      {HOURS.map((hour) => (
                        <div className="tt-slot" key={hour} style={{ height: hourHeight }} />
                      ))}
                      {placements.map((item) => {
                        const position = {
                          top: (item.start / 60) * hourHeight,
                          left: `calc(${(item.lane / item.lanes) * 100}% + 3px)`,
                          width: `calc(${100 / item.lanes}% - 7px)`,
                        }
                        if (item.deadline)
                          return (
                            <div
                              className="tt-deadline"
                              key={'due-' + item.task.id + item.task.occurrenceKey}
                              style={position}
                            >
                              <span className="deadline-dot" />
                              <div className="deadline-labels">
                                <button
                                  type="button"
                                  className={
                                    'deadline-label' +
                                    (item.task.status === 'done' ? ' completed' : '')
                                  }
                                  title={
                                    t('calendar.deadline') +
                                    ' ' +
                                    clock(item.task.dueAt!) +
                                    ' · ' +
                                    item.task.title
                                  }
                                  onClick={() => onEdit(item.task)}
                                >
                                  <Flag size={11} aria-hidden="true" />
                                  <time>{clock(item.task.dueAt!)}</time>
                                  <span>{item.task.title}</span>
                                </button>
                              </div>
                            </div>
                          )
                        const endMinutes = item.task.endAt ? new Date(item.task.endAt) : day
                        const actualEnd = isSameDay(endMinutes, day)
                          ? endMinutes.getHours() * 60 + endMinutes.getMinutes()
                          : 1440
                        const blockHeight = Math.max(
                          ((actualEnd - item.start) / 60) * hourHeight,
                          20,
                        )
                        return (
                          <button
                            type="button"
                            key={item.task.id + (item.task.occurrenceKey ?? '')}
                            data-todo-id={item.task.id}
                            className={
                              'tt-block' +
                              (item.task.status === 'done' ? ' completed' : '') +
                              (blockHeight < 50 ? ' short' : '')
                            }
                            onClick={() => onEdit(item.task)}
                            title={
                              item.task.title +
                              ' · ' +
                              clock(item.task.startAt!) +
                              '–' +
                              clock(item.task.endAt!)
                            }
                            style={{
                              ...position,
                              height: blockHeight,
                              borderLeftColor: taskColor(item.task),
                              background: `color-mix(in srgb, ${taskColor(item.task)} 22%, var(--surface-strong))`,
                            }}
                          >
                            <span className="tt-block-title">{item.task.title}</span>
                            <span className="tt-block-time">
                              {clock(item.task.startAt!)}–{clock(item.task.endAt!)}
                            </span>
                          </button>
                        )
                      })}
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
