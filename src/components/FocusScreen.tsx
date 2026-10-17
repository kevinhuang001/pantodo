import { useEffect, useRef } from 'react'
import { useAppStore } from '@/domain/store'
import { useFocusStore } from '@/domain/focus'
import { clockLabel, elapsedSeconds } from '@/domain/time'
import { useNow } from '@/hooks'
import { t } from '@/i18n'
import { Icon } from './Icon'

export function FocusScreen() {
  const active = useFocusStore((state) => state.active)
  const countdown = useFocusStore((state) => state.countdown)
  useEffect(() => {
    if (countdown === null) return
    const timeout = window.setTimeout(() => useFocusStore.getState().tick(), 1000)
    return () => window.clearTimeout(timeout)
  }, [countdown])
  const leave = useFocusStore((state) => state.leave)
  const timer = useAppStore((state) => state.timer)
  const tasks = useAppStore((state) => state.tasks)
  const projects = useAppStore((state) => state.projects)
  const command = useAppStore((state) => state.timeCommand)
  const now = useNow(1000)
  const exit = useRef<HTMLButtonElement>(null)
  const hasTimer = timer !== null

  useEffect(() => {
    if (!active) return
    if (!hasTimer) {
      leave()
      return
    }
    const before = document.activeElement as HTMLElement | null
    exit.current?.focus()
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        leave()
      }
    }
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('keydown', key)
      before?.focus()
    }
  }, [active, hasTimer, leave])

  if (!timer || (!active && countdown === null)) return null
  if (countdown !== null)
    return (
      <section className="focus-screen focus-countdown" aria-label={t('work.entering')}>
        <span>{t('work.entering')}</span>
        <output aria-live="polite">{countdown}</output>
        <button className="secondary" onClick={leave}>
          {t('dialog.cancel')}
        </button>
      </section>
    )
  const task = tasks.find((item) => item.id === timer.taskId)
  const project = projects.find((item) => item.id === task?.projectId)
  return (
    <section className="focus-screen" role="region" aria-labelledby="focus-title">
      <header className="focus-header">
        <span className="little-label">Pantodo · {t('work.focus')}</span>
        <button ref={exit} className="secondary focus-exit" onClick={leave}>
          <Icon name="minimize" size={15} />
          {t('work.exitFocus')} <kbd>esc</kbd>
        </button>
      </header>
      <div className="focus-content">
        <span className="little-label">
          {timer.startedAt ? t('work.running') : t('work.paused')}
        </span>
        <h1 id="focus-title">{task?.title ?? t('work.deleted')}</h1>
        {project ? (
          <span className="focus-project">
            {project.emoji} {project.name}
          </span>
        ) : null}
        <output className="focus-clock" aria-label={t('work.elapsed')}>
          {clockLabel(elapsedSeconds(timer, now))}
        </output>
        <p className="focus-message">{t('work.focusMessage')}</p>
        <div className="focus-actions">
          <button
            className="secondary"
            onClick={() => command({ kind: timer.startedAt ? 'pause' : 'resume' })}
          >
            <Icon name={timer.startedAt ? 'pause' : 'play'} />
            {timer.startedAt ? t('work.pause') : t('work.resume')}
          </button>
          <button
            className="primary"
            onClick={() => {
              command({ kind: 'stop' })
              leave()
            }}
          >
            <Icon name="stop" />
            {t('work.stop')}
          </button>
        </div>
      </div>
      <footer className="focus-footer">{t('work.focusExitHint')}</footer>
    </section>
  )
}
