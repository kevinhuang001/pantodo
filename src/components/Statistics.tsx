import { StatisticsCharts } from './StatisticsCharts'
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover'
import { Checkbox } from './ui/checkbox'
import { DateTimeField } from './DateTimeField'
import { SelectField } from './SelectField'
import { useMemo, useState } from 'react'
import { addDays, startOfDay, startOfMonth, startOfYear, subDays } from 'date-fns'
import { buildStatistics, csvCell } from '@/domain/statistics'
import { clippedSeconds } from '@/domain/time'
import { formatDateTime, formatMinutes, toDateInputValue } from '@/domain/date'
import { useAppStore } from '@/domain/store'
import type { Task, TimeEntry } from '@/domain/types'
import { useNow } from '@/hooks'
import { getLocale, t } from '@/i18n'
import { Icon } from './Icon'
import { TimeEntryDialog } from './TimeEntryDialog'
import { ConfirmDialog } from './ConfirmDialog'

function duration(seconds: number) {
  return seconds > 0 && seconds < 60
    ? Math.round(seconds) + 's'
    : formatMinutes(Math.round(seconds / 60))
}
function plannedDuration(task: Task | undefined) {
  return task?.startAt && task.endAt
    ? formatMinutes(Math.round((Date.parse(task.endAt) - Date.parse(task.startAt)) / 60000))
    : '—'
}
export function Statistics() {
  const projects = useAppStore((s) => s.projects),
    tags = useAppStore((s) => s.tags),
    tasks = useAppStore((s) => s.tasks),
    taskTags = useAppStore((s) => s.taskTags),
    timeEntries = useAppStore((s) => s.timeEntries),
    timer = useAppStore((s) => s.timer),
    views = useAppStore((s) => s.views),
    settings = useAppStore((s) => s.settings)
  const now = useNow(timer?.startedAt ? 1000 : 60000)
  const [period, setPeriod] = useState<string>(settings.statisticsPeriod ?? 'week'),
    [projectId, setProjectId] = useState(''),
    [tagIds, setTagIds] = useState<string[]>([])
  const [from, setFrom] = useState(() => toDateInputValue(subDays(new Date(), 6).toISOString())),
    [to, setTo] = useState(() => toDateInputValue(new Date().toISOString()))
  const [entryDialog, setEntryDialog] = useState<{ entry: TimeEntry | null } | null>(null),
    [deleting, setDeleting] = useState<TimeEntry | null>(null)
  const [category, setCategory] = useState<'project' | 'tag'>('project')
  const today = startOfDay(now)
  const start =
    period === 'custom'
      ? new Date(from + 'T00:00')
      : period === 'today'
        ? today
        : period === 'year'
          ? startOfYear(now)
          : period === 'month'
            ? startOfMonth(now)
            : subDays(today, 6)
  const end = period === 'custom' ? addDays(new Date(to + 'T00:00'), 1) : addDays(today, 1)
  const valid =
    Number.isFinite(start.getTime()) &&
    Number.isFinite(end.getTime()) &&
    end > start &&
    (end.getTime() - start.getTime()) / 86400000 <= 367
  const workspace = useMemo(
    () => ({ projects, tags, tasks, taskTags, timeEntries, timer, views, settings }),
    [projects, tags, tasks, taskTags, timeEntries, timer, views, settings],
  )
  const filter = { start: valid ? start : today, end: valid ? end : today, projectId, tagIds }
  const stats = buildStatistics(workspace, filter, now)
  const previousEnd = new Date(filter.start),
    previousStart = new Date(
      previousEnd.getTime() - (filter.end.getTime() - filter.start.getTime()),
    )
  const previous = buildStatistics(
    workspace,
    { ...filter, start: previousStart, end: previousEnd },
    now,
  ).total
  const projectById = new Map(projects.map((p) => [p.id, p])),
    tagById = new Map(tags.map((p) => [p.id, p])),
    taskById = new Map(tasks.map((p) => [p.id, p]))
  const liveCount = stats.entries.filter((item) => item.id === 'live').length
  function exportCsv() {
    const rows = [
      [
        t('task.field.title'),
        t('plan.start'),
        t('plan.end'),
        t('stats.duration'),
        t('task.field.project'),
        t('task.field.tags'),
        t('work.note'),
      ],
      ...stats.entries.map((entry) => [
        entry.taskId ? (taskById.get(entry.taskId)?.title ?? t('work.deleted')) : t('work.free'),
        new Date(Math.max(Date.parse(entry.startedAt), filter.start.getTime())).toISOString(),
        new Date(Math.min(Date.parse(entry.endedAt), filter.end.getTime())).toISOString(),
        clippedSeconds(entry, filter.start, filter.end) / 60,
        entry.taskId
          ? (projectById.get(taskById.get(entry.taskId)?.projectId ?? '')?.name ?? '')
          : '',
        entry.taskId
          ? (taskTags[entry.taskId] ?? []).map((id) => tagById.get(id)?.name ?? '').join(' / ')
          : '',
        entry.note,
      ]),
    ]
    const url = URL.createObjectURL(
      new Blob(['\ufeff' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n')], {
        type: 'text/csv;charset=utf-8',
      }),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'pantodo-time-' + toDateInputValue(filter.start.toISOString()) + '.csv'
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <div className="statistics">
      <div className="stats-controls">
        <div className="layout-pills" role="group" aria-label={t('stats.period')}>
          {(['today', 'week', 'month', 'year', 'custom'] as const).map((key) => (
            <button
              key={key}
              className={period === key ? 'active' : ''}
              aria-pressed={period === key}
              onClick={() => setPeriod(key)}
            >
              {t(('stats.' + key) as 'stats.week')}
            </button>
          ))}
        </div>
        <span className="toolbar-spacer" />
        <button className="secondary" onClick={exportCsv} disabled={!valid}>
          <Icon name="download" size={13} />
          {t('stats.export')}
        </button>
        <button className="primary" onClick={() => setEntryDialog({ entry: null })}>
          <Icon name="plus" size={14} />
          {t('work.manual')}
        </button>
      </div>
      <div className="stats-filters">
        {period === 'custom' ? (
          <>
            <DateTimeField
              aria-label={t('stats.from')}
              dateOnly
              value={from}
              onChange={(next) => setFrom(next)}
            />
            <span>—</span>
            <DateTimeField
              aria-label={t('stats.to')}
              dateOnly
              value={to}
              onChange={(next) => setTo(next)}
            />
          </>
        ) : null}
        <SelectField
          className="secondary stats-project-picker"
          contentClassName="stats-project-menu"
          icon={<Icon name="folder" size={14} />}
          aria-label={t('task.field.project')}
          value={projectId}
          onValueChange={(e) => setProjectId(e)}
        >
          <option value="">{t('stats.allProjects')}</option>
          {projects
            .filter((p) => !p.deletedAt)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.emoji} {p.name}
              </option>
            ))}
        </SelectField>
        <Popover>
          <PopoverTrigger asChild>
            <button className="secondary stats-tag-picker" type="button">
              {t('stats.allTags')}
              {tagIds.length ? ' · ' + tagIds.length : ''}
              <Icon name="chevronDown" size={13} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="stats-tag-menu product-tag-menu" align="end">
            {tags
              .filter((p) => !p.deletedAt)
              .map((tag) => (
                <label key={tag.id}>
                  <Checkbox
                    checked={tagIds.includes(tag.id)}
                    onCheckedChange={() =>
                      setTagIds((current) =>
                        current.includes(tag.id)
                          ? current.filter((id) => id !== tag.id)
                          : [...current, tag.id],
                      )
                    }
                  />
                  {tag.name}
                </label>
              ))}
            <button className="text-button" onClick={() => setTagIds([])}>
              {t('panel.all')}
            </button>
          </PopoverContent>
        </Popover>
      </div>
      {!valid ? (
        <p role="alert" className="form-error">
          {t('stats.invalidDates')}
        </p>
      ) : null}
      <div className="stat-cards">
        <section>
          <span>{t('stats.total')}</span>
          <strong data-testid="stats-total">{duration(stats.total)}</strong>
          <small>
            {previous > 0
              ? `${(((stats.total - previous) / previous) * 100).toFixed(0)}% ${t('stats.change')}`
              : '—'}
          </small>
        </section>
        <section>
          <span>{t('stats.completed')}</span>
          <strong>
            {stats.completed}
            <small> Todo</small>
          </strong>
          <small>
            {new Intl.DateTimeFormat(getLocale(), { month: 'short', day: 'numeric' }).format(
              filter.start,
            )}
          </small>
        </section>
        <section>
          <span>{t('stats.sessions')}</span>
          <strong>{stats.entries.length}</strong>
          <small>{liveCount ? t('stats.active') : t('work.record')}</small>
        </section>
        <section>
          <span>{t('stats.average')}</span>
          <strong>{duration(stats.total / Math.max(stats.daily.length, 1))}</strong>
          <small>{t('stats.daily')}</small>
        </section>
      </div>
      <StatisticsCharts
        stats={stats}
        workspace={workspace}
        start={filter.start}
        end={filter.end}
        category={category}
        onCategory={setCategory}
      />
      <section className="stats-ledger">
        <h3>{t('stats.estimate')}</h3>
        {stats.byTask.size ? (
          <div className="time-table-wrap">
            <table className="time-table">
              <thead>
                <tr>
                  <th>Todo</th>
                  <th>{t('plan.duration')}</th>
                  <th>{t('stats.actual')}</th>
                </tr>
              </thead>
              <tbody>
                {[...stats.byTask]
                  .sort((a, b) => b[1] - a[1])
                  .map(([id, seconds]) => (
                    <tr key={id}>
                      <td>
                        {taskById.get(id)?.title ?? (id ? t('work.deleted') : t('work.free'))}
                      </td>
                      <td>{plannedDuration(taskById.get(id))}</td>
                      <td>{duration(seconds)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="stats-empty">{t('stats.empty')}</p>
        )}
      </section>
      <section className="stats-ledger">
        <h3>{t('work.record')}</h3>
        <div className="time-table-wrap">
          <table className="time-table">
            <thead>
              <tr>
                <th>Todo</th>
                <th>{t('plan.start')}</th>
                <th>{t('stats.duration')}</th>
                <th>{t('work.note')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {stats.entries.map((entry) => (
                <tr key={entry.id} data-entry-id={entry.id}>
                  <td>
                    {entry.taskId
                      ? (taskById.get(entry.taskId)?.title ?? t('work.deleted'))
                      : t('work.free')}
                    <small>
                      {entry.id === 'live'
                        ? t('work.running')
                        : t(('work.source.' + entry.source) as 'work.source.timer')}
                    </small>
                  </td>
                  <td>
                    {formatDateTime(entry.startedAt, getLocale())}
                    <small>{formatDateTime(entry.endedAt, getLocale())}</small>
                  </td>
                  <td>{duration(clippedSeconds(entry, filter.start, filter.end))}</td>
                  <td className="ledger-note">{entry.note || '—'}</td>
                  <td>
                    {entry.id === 'live' ? null : (
                      <div className="ledger-actions">
                        <button
                          className="icon-button"
                          aria-label={t('work.edit')}
                          onClick={() => setEntryDialog({ entry })}
                        >
                          <Icon name="pencil" size={13} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={t('task.action.delete')}
                          onClick={() => setDeleting(entry)}
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!stats.entries.length ? <p className="stats-empty">{t('stats.empty')}</p> : null}
      </section>
      {entryDialog ? (
        <TimeEntryDialog entry={entryDialog.entry} onClose={() => setEntryDialog(null)} />
      ) : null}
      {deleting ? (
        <ConfirmDialog
          title={t('task.action.delete')}
          body={t('work.record') + ' · ' + formatDateTime(deleting.startedAt, getLocale())}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            useAppStore.getState().timeCommand({ kind: 'delete', id: deleting.id })
            setDeleting(null)
          }}
        />
      ) : null}
    </div>
  )
}
