import { useEffect, useRef } from 'react'
import { useAppStore } from '@/domain/store'
import { useFocusStore } from '@/domain/focus'
import { clockLabel, elapsedSeconds } from '@/domain/time'
import { useNow } from '@/hooks'
import { onFullscreenExit } from '@/platform'
import { t } from '@/i18n'
import { PaperFriend } from './PaperFriend'
import { Icon } from './Icon'

export function FocusScreen() {
  const active = useFocusStore((state) => state.active)
  const fullscreenError = useFocusStore((state) => state.fullscreenError)
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
      if (event.key === 'Tab') {
        const buttons = Array.from(
          document.querySelectorAll<HTMLButtonElement>('.focus-screen button'),
        )
        const first = buttons[0],
          last = buttons.at(-1)
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', key)
    let disposed = false
    let unlisten: (() => void) | undefined
    void onFullscreenExit(leave).then((fn) => {
      if (disposed) fn()
      else unlisten = fn
    })
    return () => {
      disposed = true
      unlisten?.()
      document.removeEventListener('keydown', key)
      before?.focus()
    }
  }, [active, hasTimer, leave])

  if (!active || !timer) return null
  const task = tasks.find((item) => item.id === timer.taskId)
  const project = projects.find((item) => item.id === task?.projectId)
  return (
    <div className="focus-screen" role="dialog" aria-modal="true" aria-labelledby="focus-title">
      <header className="focus-header">
        <span className="little-label">Pantodo · {t('work.focus')}</span>
        <button ref={exit} className="secondary focus-exit" onClick={leave}>
          <Icon name="minimize" size={15} />
          {t('work.exitFocus')} <kbd>esc</kbd>
        </button>
      </header>
      <main className="focus-content">
        <PaperFriend />
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
        {fullscreenError ? <p className="focus-hint">{t('work.fullscreenFallback')}</p> : null}
      </main>
      <footer className="focus-footer">{t('work.focusExitHint')}</footer>
    </div>
  )
}
