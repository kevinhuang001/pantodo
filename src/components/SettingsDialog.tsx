import { SelectField } from './SelectField'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { useState } from 'react'

import { useAppStore } from '@/domain/store'
import type { Settings } from '@/domain/types'
import { LOCALES, LOCALE_LABELS, t } from '@/i18n'
import type { Locale, LocalePreference, MessageKey } from '@/i18n'

import { Dialog, DialogContent, DialogTitle } from './ui/dialog'
import { Icon } from './Icon'
import { version } from '../../package.json'
import { desktop } from '@/platform'

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
  const settings = useAppStore((state) => state.settings)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const notify = useAppStore((state) => state.notify)
  const [pane, setPane] = useState<Pane>('general')

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
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        className="dialog settings-window product-dialog"
        aria-describedby={undefined}
        showCloseButton={false}
      >
        <header className="settings-header">
          <span className="mark">
            <Icon name="settings" size={18} />
          </span>
          <DialogTitle>{t('toolbar.settings')}</DialogTitle>
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
                  <SelectField
                    className="select"
                    value={settings.theme}
                    aria-label={t('toolbar.theme')}
                    onValueChange={(event) => patch({ theme: event as Settings['theme'] })}
                  >
                    <option value="system">{t('theme.system')}</option>
                    <option value="light">{t('theme.light')}</option>
                    <option value="dark">{t('theme.dark')}</option>
                  </SelectField>
                </div>
                <div className="settings-row">
                  <span className="settings-label">{t('toolbar.language')}</span>
                  <SelectField
                    className="select"
                    value={settings.localePreference}
                    aria-label={t('toolbar.language')}
                    onValueChange={(event) =>
                      patch({ localePreference: event as LocalePreference })
                    }
                  >
                    <option value="system">{t('language.system')}</option>
                    {LOCALES.map((locale: Locale) => (
                      <option key={locale} value={locale}>
                        {LOCALE_LABELS[locale]}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div className="settings-row">
                  <span className="settings-label">{t('settings.weekStart')}</span>
                  <SelectField
                    className="select"
                    value={settings.weekStartsOn}
                    aria-label={t('settings.weekStart')}
                    onValueChange={(event) => patch({ weekStartsOn: Number(event) === 0 ? 0 : 1 })}
                  >
                    <option value={1}>{t('settings.monday')}</option>
                    <option value={0}>{t('settings.sunday')}</option>
                  </SelectField>
                </div>
              </div>
            ) : null}

            {pane === 'timer' ? (
              <div className="settings-card">
                <div className="settings-row">
                  <span className="settings-label">{t('calendar.defaultDuration')}</span>
                  <Input
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
                  <Button
                    type="button"
                    className="secondary"
                    variant="outline"
                    onClick={exportJson}
                  >
                    {t('settings.export')}
                  </Button>
                </div>
              </div>
            ) : null}

            {pane === 'about' ? (
              <div className="settings-card">
                <div className="settings-row">
                  <span className="settings-label">{t('app.name')}</span>
                  <span className="count">v{version}</span>
                </div>
                <div className="settings-row">
                  <span className="settings-label">{t('about.stack')}</span>
                  <span className="count">
                    {desktop ? 'Tauri 2 · Rust · React 19' : 'React 19 · TypeScript'}
                  </span>
                </div>
                <div className="settings-row">
                  <span className="settings-label">{t('about.milestone')}</span>
                  <span className="count">{desktop ? 'Desktop beta' : 'Web preview'}</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <footer className="settings-footer">
          <Button type="button" className="primary" variant="default" onClick={onClose}>
            {t('dialog.close')}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
