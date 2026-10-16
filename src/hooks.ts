import { useEffect, useMemo, useState } from 'react'

import { useAppStore } from '@/domain/store'
import type { FilterContext } from '@/domain/filters'

/** Ticking clock so due states and "today" refresh without a manual reload. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}

export function useFilterContext(now: Date): FilterContext {
  const taskTags = useAppStore((state) => state.taskTags)
  const scheduleBlocks = useAppStore((state) => state.scheduleBlocks)
  return useMemo(() => ({ taskTags, scheduleBlocks, now }), [taskTags, scheduleBlocks, now])
}

export function useDebounced<T>(value: T, delayMs = 180): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}
