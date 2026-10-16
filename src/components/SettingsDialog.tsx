import { useEffect, useRef, useState } from 'react'

import { useAppStore } from '@/domain/store'
import type { Settings } from '@/domain/types'
import { LOCALES, LOCALE_LABELS, t } from '@/i18n'
import type { Locale, LocalePreference, MessageKey } from '@/i18n'

import { Icon } from './Icon'

interface SettingsDialogProps {
  onClose: () => void
}

type Pane = 'general' | 'timer' | 'data' | 'about'

const PANES: { key: Pane; labelKey: MessageKey }[] = [
  { key: 'general', labelKey: 'settings.pane.general' },
  { key: 'timer', labelKey: 'settings.pane.timer' },
  { key: 'data', labelKey: 'settings.pane.data' },
  { key: 'about', labelKey: 'settings.pane.about' },
]

/**
 * The reference project's settings window: a macOS-style two-pane dialog. All six agreed panes are
 * present; the timer and sync panes state which milestone fills them.
 */
export function SettingsDialog({ onClose }: SettingsDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const settings = useAppStore((state) => state.settings)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const notify = useAppStore((state) => state.notify)
  const [pane, setPane] = useState<Pane>('general')

  useEffect(() => {
    const dialog = ref.current
    if (dialog !== null && !dialog.open) dialog.showModal()
  }, [])

  function patch(next: Partial<Settings>): void {
    void updateSettings(next)
  }

  function exportJson(): void {
    const state = useAppStore.getState()
    const payload = {
      projects: state.projects,
      tags: state.tags,
      tasks: state.tasks,
      taskTags: state.taskTags,
      timeEntries: state.timeEntries,
      timer: state.timer,
      views: state.views,
      settings: state.settings,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'pantodo-workspace.json'
    anchor.click()
    URL.revokeObjectURL(url)
    notify('settings.exported')
  }

  return (
    <dialog
      ref={ref}
      className="dialog settings-window"
      aria-label={t('toolbar.settings')}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
    >
      <header className="settings-header">
        <span className="mark">
          <Icon name="settings" size={18} />
        </span>
        <h2>{t('toolbar.settings')}</h2>
        <button
          type="button"
          className="icon-button"
          style={{ marginLeft: 'auto' }}
          aria-label={t('dialog.close')}
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </header>

      <div className="settings-body">
        <nav className="settings-nav">
          {PANES.map((entry) => (
            <button
              key={entry.key}
              type="button"
              className={entry.key === pane ? 'active' : ''}
              aria-current={entry.key === pane ? 'true' : undefined}
              onClick={() => setPane(entry.key)}
            >
              {t(entry.labelKey)}
            </button>
          ))}
        </nav>

        <div className="settings-panel">
          {pane === 'general' ? (
            <div className="settings-card">
              <div className="settings-row">
                <span className="settings-label">{t('toolbar.theme')}</span>
                <select
                  className="select"
                  value={settings.theme}
                  aria-label={t('toolbar.theme')}
                  onChange={(event) => patch({ theme: event.target.value as Settings['theme'] })}
                >
                  <option value="system">{t('theme.system')}</option>
                  <option value="light">{t('theme.light')}</option>
                  <option value="dark">{t('theme.dark')}</option>
                </select>
              </div>
              <div className="settings-row">
                <span className="settings-label">{t('toolbar.language')}</span>
                <select
                  className="select"
                  value={settings.localePreference}
                  aria-label={t('toolbar.language')}
                  onChange={(event) =>
                    patch({ localePreference: event.target.value as LocalePreference })
                  }
                >
                  <option value="system">{t('language.system')}</option>
                  {LOCALES.map((locale: Locale) => (
                    <option key={locale} value={locale}>
                      {LOCALE_LABELS[locale]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="settings-row">
                <span className="settings-label">{t('settings.weekStart')}</span>
                <select
                  className="select"
                  value={settings.weekStartsOn}
                  aria-label={t('settings.weekStart')}
                  onChange={(event) =>
                    patch({ weekStartsOn: Number(event.target.value) === 0 ? 0 : 1 })
                  }
                >
                  <option value={1}>{t('settings.monday')}</option>
                  <option value={0}>{t('settings.sunday')}</option>
                </select>
              </div>
            </div>
          ) : null}

          {pane === 'timer' ? (
            <div className="settings-card">
              <div className="settings-row">
                <span className="settings-label">{t('calendar.defaultDuration')}</span>
                <input
                  type="number"
                  className="input"
                  min={5}
                  max={1440}
                  step={5}
                  aria-label={t('calendar.defaultDuration')}
                  value={settings.defaultDurationMinutes ?? 30}
                  onChange={(event) =>
                    patch({
                      defaultDurationMinutes: Math.min(
                        1440,
                        Math.max(5, Number(event.target.value)),
                      ),
                    })
                  }
                />
              </div>
              <p className="settings-timer-note">{t('work.autoStop')}</p>
            </div>
          ) : null}

          {pane === 'data' ? (
            <div className="settings-card">
              <div className="settings-row">
                <span className="settings-label">{t('settings.export')}</span>
                <button type="button" className="secondary" onClick={exportJson}>
                  {t('settings.export')}
                </button>
              </div>
            </div>
          ) : null}

          {pane === 'about' ? (
            <div className="settings-card">
              <div className="settings-row">
                <span className="settings-label">{t('app.name')}</span>
                <span className="count">v0.2.0</span>
              </div>
              <div className="settings-row">
                <span className="settings-label">{t('about.stack')}</span>
                <span className="count">React 19 · TypeScript</span>
              </div>
              <div className="settings-row">
                <span className="settings-label">{t('about.milestone')}</span>
                <span className="count">v0.2</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <footer className="settings-footer">
        <button type="button" className="primary" onClick={onClose}>
          {t('dialog.close')}
        </button>
      </footer>
    </dialog>
  )
}
