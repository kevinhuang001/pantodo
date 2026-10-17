import { useEffect, useRef } from 'react'
import { init, use as registerCharts, type ECharts } from 'echarts/core'
import { BarChart, LineChart, PieChart, HeatmapChart, GaugeChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
  AriaComponent,
} from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'

registerCharts([
  BarChart,
  LineChart,
  PieChart,
  HeatmapChart,
  GaugeChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
  AriaComponent,
  SVGRenderer,
])

export function Chart({
  option,
  label,
  height = 280,
}: {
  option: EChartsOption
  label: string
  height?: number
}) {
  const node = useRef<HTMLDivElement>(null)
  const chart = useRef<ECharts | null>(null)
  useEffect(() => {
    if (!node.current) return
    const instance = init(node.current, undefined, { renderer: 'svg' })
    chart.current = instance
    const observer = new ResizeObserver(() => instance.resize())
    observer.observe(node.current)
    return () => {
      observer.disconnect()
      instance.dispose()
      chart.current = null
    }
  }, [])
  useEffect(() => {
    chart.current?.setOption(
      { animation: false, aria: { enabled: true, label: { description: label } }, ...option },
      { notMerge: true },
    )
  }, [option, label])
  return (
    <div
      ref={node}
      className="echart"
      role="img"
      aria-label={label}
      style={{ height, width: '100%' }}
    />
  )
}
