import { useEffect, useRef, useState } from 'react'

import { useAppStore } from '@/domain/store'
import type { Settings } from '@/domain/types'
import { LOCALES, LOCALE_LABELS, t } from '@/i18n'
import type { Locale, LocalePreference, MessageKey } from '@/i18n'

import { Icon } from './Icon'

interface SettingsDialogProps {
  onClose: () => void
}

type Pane = 'general' | 'reminders' | 'timer' | 'sync' | 'data' | 'about'

const PANES: { key: Pane; labelKey: MessageKey }[] = [
  { key: 'general', labelKey: 'settings.pane.general' },
  { key: 'reminders', labelKey: 'settings.pane.reminders' },
  { key: 'timer', labelKey: 'settings.pane.timer' },
  { key: 'sync', labelKey: 'settings.pane.sync' },
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
  const resetWorkspace = useAppStore((state) => state.resetWorkspace)
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
      scheduleBlocks: state.scheduleBlocks,
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

          {pane === 'reminders' ? (
            <div className="settings-card">
              <div className="settings-row">
                <span className="settings-label">{t('settings.reminderLead')}</span>
                <input
                  type="number"
                  min={0}
                  max={240}
                  step={5}
                  className="input"
                  value={settings.reminderLeadMinutes}
                  aria-label={t('settings.reminderLead')}
                  onChange={(event) => patch({ reminderLeadMinutes: Number(event.target.value) })}
                />
              </div>
              <div className="settings-row">
                <span className="settings-label">{t('settings.silent')}</span>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={settings.notificationsSilent}
                    aria-label={t('settings.silent')}
                    onChange={(event) => patch({ notificationsSilent: event.target.checked })}
                  />
                </label>
              </div>
            </div>
          ) : null}

          {pane === 'timer' ? <p className="banner">{t('settings.timerNote')}</p> : null}
          {pane === 'sync' ? <p className="banner">{t('settings.syncNote')}</p> : null}

          {pane === 'data' ? (
            <div className="settings-card">
              <div className="settings-row">
                <span className="settings-label">{t('settings.export')}</span>
                <button type="button" className="secondary" onClick={exportJson}>
                  {t('settings.export')}
                </button>
              </div>
              <div className="settings-row">
                <span className="settings-label">
                  {t('settings.reset')}
                  <small>fixture</small>
                </span>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => {
                    void resetWorkspace()
                  }}
                >
                  {t('settings.reset')}
                </button>
              </div>
            </div>
          ) : null}

          {pane === 'about' ? (
            <div className="settings-card">
              <div className="settings-row">
                <span className="settings-label">{t('app.name')}</span>
                <span className="count">v0.1.0</span>
              </div>
              <div className="settings-row">
                <span className="settings-label">{t('about.stack')}</span>
                <span className="count">Tauri 2 · React 19 · TypeScript</span>
              </div>
              <div className="settings-row">
                <span className="settings-label">{t('about.milestone')}</span>
                <span className="count">M1</span>
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
