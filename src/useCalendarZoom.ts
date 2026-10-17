import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
const clamp = (value: number) => Math.max(36, Math.min(144, value))
interface Gesture extends Event {
  scale: number
  clientY: number
}
/** Zoom only the calendar grid; preserve the hour under the gesture and leave normal scrolling alone. */
export function useCalendarZoom(
  ref: RefObject<HTMLDivElement | null>,
  value: number,
  onChange: (value: number) => void,
  onCommit: (value: number) => void,
  enabled: boolean,
) {
  const current = useRef({ value, onChange, onCommit }),
    previous = useRef(value)
  const anchor = useRef<{ hour: number; offset: number } | null>(null)
  useLayoutEffect(() => {
    current.current = { value, onChange, onCommit }
    const node = ref.current
    if (node && previous.current !== value) {
      node.scrollTop = anchor.current
        ? anchor.current.hour * value - anchor.current.offset
        : (node.scrollTop * value) / previous.current
    }
    anchor.current = null
    previous.current = value
  }, [value, onChange, onCommit, ref])
  useEffect(() => {
    const node = ref.current
    if (!enabled || !node) return
    let timer: ReturnType<typeof setTimeout> | undefined,
      dirty = false,
      raw = current.current.value
    let gestureBase = raw,
      touchBase = raw,
      touchDistance = 0,
      touchActive = false,
      gestureActive = false
    const apply = (next: number, clientY: number) => {
      raw = clamp(next)
      const height = Math.round(raw),
        old = current.current.value
      if (height === old) return
      const offset = Math.max(
        0,
        Math.min(node.clientHeight, clientY - node.getBoundingClientRect().top),
      )
      anchor.current = { hour: (node.scrollTop + offset) / previous.current, offset }
      current.current.value = height
      current.current.onChange(height)
      dirty = true
    }
    const commit = () => {
      if (timer) clearTimeout(timer)
      timer = undefined
      if (dirty) {
        dirty = false
        current.current.onCommit(current.current.value)
      }
    }
    const later = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(commit, 180)
    }
    const wheel = (event: WheelEvent) => {
      if ((!event.ctrlKey && !event.metaKey) || touchActive || gestureActive) return
      event.preventDefault()
      if (!timer) raw = current.current.value
      const pixels =
        event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientHeight : 1)
      apply(raw * Math.exp(-Math.max(-100, Math.min(100, pixels)) * 0.006), event.clientY)
      later()
    }
    const gestureStart = (event: Event) => {
      if (touchActive) return
      event.preventDefault()
      gestureActive = true
      gestureBase = current.current.value
    }
    const gestureChange = (event: Event) => {
      if (!gestureActive || touchActive) return
      event.preventDefault()
      const e = event as Gesture
      if (e.scale > 0)
        apply(
          gestureBase * e.scale,
          Number.isFinite(e.clientY)
            ? e.clientY
            : node.getBoundingClientRect().top + node.clientHeight / 2,
        )
    }
    const gestureEnd = (event: Event) => {
      if (gestureActive) {
        event.preventDefault()
        gestureActive = false
        commit()
      }
    }
    const distance = (touches: TouchList) =>
      Math.hypot(
        touches[0]!.clientX - touches[1]!.clientX,
        touches[0]!.clientY - touches[1]!.clientY,
      )
    const touchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return
      event.preventDefault()
      touchActive = true
      gestureActive = false
      touchDistance = distance(event.touches)
      touchBase = current.current.value
    }
    const touchMove = (event: TouchEvent) => {
      if (!touchActive || event.touches.length !== 2 || !touchDistance) return
      event.preventDefault()
      apply(
        (touchBase * distance(event.touches)) / touchDistance,
        (event.touches[0]!.clientY + event.touches[1]!.clientY) / 2,
      )
    }
    const touchEnd = (event: TouchEvent) => {
      if (touchActive && event.touches.length < 2) {
        touchActive = false
        commit()
      }
    }
    node.addEventListener('wheel', wheel, { passive: false })
    node.addEventListener('gesturestart', gestureStart, { passive: false })
    node.addEventListener('gesturechange', gestureChange, { passive: false })
    node.addEventListener('gestureend', gestureEnd, { passive: false })
    node.addEventListener('touchstart', touchStart, { passive: false })
    node.addEventListener('touchmove', touchMove, { passive: false })
    node.addEventListener('touchend', touchEnd)
    node.addEventListener('touchcancel', touchEnd)
    return () => {
      commit()
      node.removeEventListener('wheel', wheel)
      node.removeEventListener('gesturestart', gestureStart)
      node.removeEventListener('gesturechange', gestureChange)
      node.removeEventListener('gestureend', gestureEnd)
      node.removeEventListener('touchstart', touchStart)
      node.removeEventListener('touchmove', touchMove)
      node.removeEventListener('touchend', touchEnd)
      node.removeEventListener('touchcancel', touchEnd)
    }
  }, [enabled, ref])
}
