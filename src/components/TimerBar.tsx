import { useEffect } from 'react'
import { STORAGE_KEY } from '@/bridge'
import { useAppStore } from '@/domain/store'
import { clockLabel, elapsedSeconds } from '@/domain/time'
import { useNow } from '@/hooks'
import { t } from '@/i18n'
import { useFocusStore } from '@/domain/focus'
import { Icon } from './Icon'

/** Synchronous exit persistence plus durable heartbeats for interrupted processes. */
export function TimerLifecycle() {
  useEffect(() => {
    const store = useAppStore
    const heartbeat = () => {
      if (store.getState().timer) store.getState().timeCommand({ kind: 'heartbeat' })
    }
    const stop = () => store.getState().suspendTimer()
    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) store.getState().reloadWorkspace()
    }
    const interval = window.setInterval(heartbeat, 5000)
    const storageError = (event: Event) =>
      store.setState({ error: String((event as CustomEvent).detail) })
    window.addEventListener('pantodo:storage-error', storageError)
    window.addEventListener('pagehide', stop)
    window.addEventListener('beforeunload', stop)
    document.addEventListener('freeze', stop)
    window.addEventListener('storage', sync)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('pantodo:storage-error', storageError)
      window.removeEventListener('pagehide', stop)
      window.removeEventListener('beforeunload', stop)
      document.removeEventListener('freeze', stop)
      window.removeEventListener('storage', sync)
    }
  }, [])
  return null
}
export function TimerBar({ onOpen }: { onOpen: () => void }) {
  const timer = useAppStore((state) => state.timer)
  const tasks = useAppStore((state) => state.tasks)
  const command = useAppStore((state) => state.timeCommand)
  const now = useNow(1000)
  if (!timer) return null
  const task = tasks.find((item) => item.id === timer.taskId)
  return (
    <div className="work-timer" role="region" aria-label={t('work.timer')}>
      <span className={timer.startedAt ? 'timer-pulse' : 'timer-pulse paused'} />
      <button className="timer-task" onClick={onOpen}>
        <small>{timer.startedAt ? t('work.running') : t('work.paused')}</small>
        <strong>{task?.title ?? t('work.deleted')}</strong>
      </button>
      <output className="timer-clock">{clockLabel(elapsedSeconds(timer, now))}</output>
      <button className="secondary" onClick={() => useFocusStore.getState().enter()}>
        <Icon name="maximize" size={13} />
        {t('work.focus')}
      </button>
      <button
        className="secondary"
        onClick={() => command({ kind: timer.startedAt ? 'pause' : 'resume' })}
      >
        <Icon name={timer.startedAt ? 'pause' : 'play'} size={13} />
        {timer.startedAt ? t('work.pause') : t('work.resume')}
      </button>
      <button className="primary" onClick={() => command({ kind: 'stop' })}>
        <Icon name="stop" size={13} />
        {t('work.stop')}
      </button>
    </div>
  )
}
