import { occurrences } from '@/domain/recurrence'
import { useSyncExternalStore } from 'react'
import type { EChartsOption } from 'echarts'
import type { buildStatistics } from '@/domain/statistics'
import { hourlyFocus } from '@/domain/insights'
import { clippedSeconds } from '@/domain/time'
import { formatMinutes } from '@/domain/date'
import { useAppStore } from '@/domain/store'
import type { Task, Workspace } from '@/domain/types'
import { getLocale, t } from '@/i18n'
import { Chart } from './Chart'

function subscribeAppearance(update: () => void) {
  const observer = new MutationObserver(update)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'data-accent'],
  })
  return () => observer.disconnect()
}
function appearanceSnapshot() {
  return document.documentElement.dataset.theme + ':' + document.documentElement.dataset.accent
}
type Stats = ReturnType<typeof buildStatistics>
const minutes = (seconds: number) => Math.round((seconds / 60) * 100) / 100
function planned(task?: Task) {
  return task?.startAt && task.endAt
    ? (Date.parse(task.endAt) - Date.parse(task.startAt)) / 60000
    : 0
}
export function StatisticsCharts({
  stats,
  workspace,
  start,
  end,
  category,
  onCategory,
}: {
  stats: Stats
  workspace: Workspace
  start: Date
  end: Date
  category: 'project' | 'tag'
  onCategory: (value: 'project' | 'tag') => void
}) {
  useSyncExternalStore(subscribeAppearance, appearanceSnapshot)
  const settings = useAppStore((s) => s.settings)
  const style = getComputedStyle(document.documentElement)
  const accent = style.getPropertyValue('--accent').trim() || '#52734b'
  const dark = document.documentElement.dataset.theme === 'dark'
  const text = dark ? '#b7c4c9' : '#677477'
  const line = dark ? '#ffffff12' : '#233a4910'
  const palette = [
    accent,
    '#78a99f',
    '#ae9bca',
    '#d6aa73',
    '#87a8ce',
    '#ba8d9b',
    '#8eae7b',
    '#939fba',
  ]
  const base: EChartsOption = {
    color: palette,
    textStyle: { fontFamily: 'inherit', color: text },
    tooltip: {
      trigger: 'axis',
      confine: true,
      renderMode: 'richText',
      backgroundColor: dark ? '#242b31' : '#fff',
      borderWidth: 0,
      textStyle: { color: text, fontSize: 12 },
    },
  }
  const axis = {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: text, fontSize: 10 },
    splitLine: { lineStyle: { color: line } },
  }
  const goal = settings.dailyFocusGoal ?? 120
  const dayLabels = stats.daily.map((d) =>
    new Intl.DateTimeFormat(getLocale(), { month: 'short', day: 'numeric' }).format(d.day),
  )
  let cumulative = 0
  const sum = stats.daily.map((d) => minutes((cumulative += d.seconds)))
  const taskById = new Map(workspace.tasks.map((task) => [task.id, task]))
  const ranking = [...stats.byTask].sort((a, b) => b[1] - a[1]).slice(0, 8)
  const taskLabel = (id: string) => taskById.get(id)?.title ?? t(id ? 'work.deleted' : 'work.free')
  const source = category === 'project' ? stats.byProject : stats.byTag
  const names = new Map(
    (category === 'project' ? workspace.projects : workspace.tags).map((v) => [v.id, v.name]),
  )
  const categories = [...source]
    .sort((a, b) => b[1] - a[1])
    .map(([id, value]) => ({
      name: names.get(id) ?? t(category === 'project' ? 'stats.noProject' : 'stats.noTag'),
      value: minutes(value),
    }))
  const heat = hourlyFocus(stats.entries, start, end)
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(getLocale(), { weekday: 'short' }).format(new Date(2026, 0, 5 + i)),
  )
  const avg = minutes(stats.total) / Math.max(stats.daily.length, 1)
  const percentage = Math.round((avg / goal) * 100)
  const trend: EChartsOption = {
    ...base,
    legend: { bottom: 0, textStyle: { color: text, fontSize: 10 } },
    grid: { left: 46, right: 46, top: 18, bottom: 60 },
    xAxis: {
      ...axis,
      type: 'category',
      data: dayLabels,
      axisLabel: { ...axis.axisLabel, hideOverlap: true },
    },
    yAxis: [
      { ...axis, type: 'value', name: t('picker.minutesShort') },
      { ...axis, type: 'value', splitLine: { show: false } },
    ],
    series: [
      {
        type: 'bar',
        name: t('stats.daily'),
        data: stats.daily.map((d) => minutes(d.seconds)),
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 26,
      },
      {
        type: 'line',
        name: t('stats.cumulative'),
        yAxisIndex: 1,
        smooth: true,
        symbol: 'none',
        data: sum,
        lineStyle: { width: 2 },
        itemStyle: { color: '#87a8ce' },
      },
    ],
  }
  const share: EChartsOption = {
    ...base,
    tooltip: { ...base.tooltip, trigger: 'item' },
    legend: { bottom: 0, type: 'scroll', textStyle: { color: text, fontSize: 10 } },
    series: [
      {
        type: 'pie',
        radius: ['44%', '69%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        label: { show: false },
        emphasis: { label: { show: true, formatter: '{b}\n{d}%', fontSize: 12, color: text } },
        data: categories,
        emptyCircleStyle: { color: line },
      },
    ],
  }
  const heatmap: EChartsOption = {
    ...base,
    tooltip: {
      trigger: 'item',
      confine: true,
      renderMode: 'richText',
      formatter: (p) => {
        const value = (p as unknown as { value: number[] }).value
        return `${weekdays[value[1]!]} · ${String(value[0]).padStart(2, '0')}:00\n${formatMinutes(Math.round(value[2]!))}`
      },
    },
    grid: { left: 48, right: 12, top: 16, bottom: 65 },
    xAxis: {
      ...axis,
      type: 'category',
      data: Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0')),
      splitArea: { show: false },
    },
    yAxis: { ...axis, type: 'category', data: weekdays, inverse: true, splitLine: { show: false } },
    visualMap: {
      min: 0,
      max: Math.max(60, ...heat.map((v) => v[2]!)),
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: { color: [dark ? '#2c333a' : '#edf1f3', accent] },
      textStyle: { color: text },
    },
    series: [
      {
        type: 'heatmap',
        data: heat,
        itemStyle: { borderWidth: 2, borderColor: dark ? '#252a2c' : '#fff', borderRadius: 3 },
      },
    ],
  }
  const rank: EChartsOption = {
    ...base,
    grid: { left: 10, right: 40, top: 10, bottom: 26, containLabel: true },
    xAxis: { ...axis, type: 'value' },
    yAxis: {
      ...axis,
      type: 'category',
      inverse: true,
      data: ranking.map(([id]) => taskLabel(id)),
      axisLabel: { ...axis.axisLabel, width: 140, overflow: 'truncate' },
      splitLine: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: ranking.map(([, value]) => minutes(value)),
        barMaxWidth: 18,
        itemStyle: { borderRadius: [0, 5, 5, 0] },
        label: { show: true, position: 'right', color: text, fontSize: 10 },
      },
    ],
  }
  const compare: EChartsOption = {
    ...base,
    legend: { bottom: 0, textStyle: { color: text, fontSize: 10 } },
    grid: { left: 40, right: 10, top: 15, bottom: 85 },
    xAxis: {
      ...axis,
      type: 'category',
      data: ranking.slice(0, 5).map(([id]) => taskLabel(id)),
      axisLabel: { ...axis.axisLabel, width: 75, overflow: 'truncate', interval: 0 },
    },
    yAxis: { ...axis, type: 'value' },
    series: [
      {
        name: t('plan.duration'),
        type: 'bar',
        data: ranking
          .slice(0, 5)
          .map(([id]) =>
            minutes(
              (taskById.get(id)?.recurrence || taskById.get(id)?.occurrences
                ? occurrences(taskById.get(id)!, start, end, Infinity).reduce(
                    (sum, row) => sum + planned(row),
                    0,
                  )
                : planned(taskById.get(id))) * 60,
            ),
          ),
        barMaxWidth: 22,
        itemStyle: { borderRadius: [3, 3, 0, 0] },
      },
      {
        name: t('stats.actual'),
        type: 'bar',
        data: ranking.slice(0, 5).map(([, v]) => minutes(v)),
        barMaxWidth: 22,
        itemStyle: { borderRadius: [3, 3, 0, 0] },
      },
    ],
  }
  const gauge: EChartsOption = {
    ...base,
    tooltip: { show: false },
    series: [
      {
        type: 'gauge',
        startAngle: 90,
        endAngle: -270,
        radius: '80%',
        pointer: { show: false },
        progress: { show: true, roundCap: true, width: 16 },
        axisLine: { lineStyle: { width: 16, color: [[1, line]] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        title: { offsetCenter: [0, '28%'], fontSize: 12, color: text },
        detail: {
          valueAnimation: false,
          formatter: () => percentage + '%',
          offsetCenter: [0, '-5%'],
          fontSize: 34,
          color: accent,
        },
        data: [
          {
            value: Math.min(percentage, 100),
            name: `${Math.round(avg)} / ${goal} ${t('picker.minutesShort')}`,
          },
        ],
      },
    ],
  }
  const longest = Math.max(0, ...stats.entries.map((e) => clippedSeconds(e, start, end)))
  const activeDays = stats.daily.filter((d) => d.seconds > 0).length
  const goalDays = stats.daily.filter((d) => d.seconds >= goal * 60).length
  return (
    <>
      <div className="insight-summary">
        <span>
          {t('stats.activeDays')}
          <strong>{activeDays}</strong>
        </span>
        <span>
          {t('stats.longest')}
          <strong>{formatMinutes(Math.round(longest / 60))}</strong>
        </span>
        <span>
          {t('stats.goalDays')}
          <strong>
            {goalDays} / {stats.daily.length}
          </strong>
        </span>
      </div>
      <div className="stats-echarts-grid">
        <section className="stats-chart">
          <h3>{t('stats.daily')}</h3>
          <Chart option={trend} label={t('stats.daily')} />
        </section>
        <section className="stats-chart">
          <div className="category-head">
            <h3>{t('stats.projectShare')}</h3>
            <div className="layout-pills">
              {(['project', 'tag'] as const).map((k) => (
                <button
                  key={k}
                  className={category === k ? 'active' : ''}
                  onClick={() => onCategory(k)}
                >
                  {t(k === 'project' ? 'stats.projects' : 'stats.tags')}
                </button>
              ))}
            </div>
          </div>
          <Chart option={share} label={t('stats.projectShare')} />
          <ul className="chart-breakdown" aria-label={t('stats.projectShare')}>
            {categories.map((item, index) => (
              <li key={item.name}>
                <i style={{ background: palette[index % palette.length] }} />
                <span>{item.name}</span>
                <strong>{formatMinutes(Math.round(item.value))}</strong>
              </li>
            ))}
          </ul>
          {category === 'tag' ? <p className="field-hint">{t('stats.tagNote')}</p> : null}
        </section>
        <section className="stats-chart">
          <h3>{t('stats.heatmap')}</h3>
          <Chart option={heatmap} label={t('stats.heatmap')} />
        </section>
        <section className="stats-chart">
          <h3>{t('stats.ranking')}</h3>
          <Chart option={rank} label={t('stats.ranking')} />
        </section>
        <section className="stats-chart">
          <h3>{t('stats.blockCompare')}</h3>
          <Chart option={compare} label={t('stats.blockCompare')} />
        </section>
        <section className="stats-chart">
          <h3>{t('stats.goalProgress')}</h3>
          <Chart option={gauge} label={t('stats.goalProgress')} />
        </section>
      </div>
    </>
  )
}
