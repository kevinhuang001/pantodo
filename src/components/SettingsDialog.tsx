import { ACCENT_COLORS } from '@/domain/accent'
import { SlidersHorizontal, Timer, Cloud, Database, Info, Download } from 'lucide-react'
import { SyncSettings } from './SyncSettings'
import { SelectField } from './SelectField'
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
  initialPane?: 'sync'
  onClose: () => void
}

type Pane = 'general' | 'timer' | 'sync' | 'data' | 'about'

const PANE_ICONS = {
  general: SlidersHorizontal,
  timer: Timer,
  sync: Cloud,
  data: Database,
  about: Info,
}

const PANES: { key: Pane; labelKey: MessageKey }[] = [
  { key: 'general', labelKey: 'settings.pane.general' },
  { key: 'timer', labelKey: 'settings.pane.timer' },
  { key: 'sync', labelKey: 'settings.pane.sync' },
  { key: 'data', labelKey: 'settings.pane.data' },
  { key: 'about', labelKey: 'settings.pane.about' },
]

export function SettingsDialog({ onClose, initialPane }: SettingsDialogProps) {
  const settings = useAppStore((state) => state.settings)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const notify = useAppStore((state) => state.notify)
  const [pane, setPane] = useState<Pane>(initialPane ?? 'general')

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
            {PANES.map((entry) => {
              const PaneIcon = PANE_ICONS[entry.key]
              return (
                <button
                  key={entry.key}
                  type="button"
                  className={entry.key === pane ? 'active' : ''}
                  aria-current={entry.key === pane ? 'true' : undefined}
                  onClick={() => setPane(entry.key)}
                >
                  <PaneIcon size={16} />
                  {t(entry.labelKey)}
                </button>
              )
            })}
          </nav>

          <div className="settings-panel">
            <div className="settings-pane-heading">
              <h2>{t(('settings.pane.' + pane) as MessageKey)}</h2>
              <p>{t(('settings.' + pane + 'Hint') as MessageKey)}</p>
            </div>
            {pane === 'sync' ? <SyncSettings /> : null}
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
                <div className="settings-row settings-accent-row">
                  <span className="settings-label">{t('settings.accentColor')}</span>
                  <div
                    className="accent-options"
                    role="group"
                    aria-label={t('settings.accentColor')}
                  >
                    {ACCENT_COLORS.map((key) => (
                      <button
                        key={key}
                        type="button"
                        className="accent-choice"
                        data-accent={key}
                        aria-pressed={settings.accentColor === key}
                        aria-label={t(('accent.' + key) as MessageKey)}
                        title={t(('accent.' + key) as MessageKey)}
                        style={{ background: `var(--accent-${key})` }}
                        onClick={() => patch({ accentColor: key })}
                      >
                        {settings.accentColor === key ? <Icon name="check" size={14} /> : null}
                      </button>
                    ))}
                  </div>
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
                <p className="settings-timer-note">{t('work.autoStop')}</p>
              </div>
            ) : null}

            {pane === 'data' ? (
              <div className="settings-card">
                <div className="settings-row">
                  <span className="settings-label">
                    {t('settings.export')}
                    <small>{t('settings.exportHint')}</small>
                  </span>
                  <Button
                    type="button"
                    className="secondary"
                    variant="outline"
                    onClick={exportJson}
                  >
                    <Download size={15} />
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
