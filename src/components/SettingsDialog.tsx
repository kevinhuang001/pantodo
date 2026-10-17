import { ACCENT_COLORS } from '@/domain/accent'
import { SlidersHorizontal, Timer, Cloud, BarChart3, Info } from 'lucide-react'
import { SyncSettings } from './SyncSettings'
import { SelectField } from './SelectField'
import { Checkbox } from './ui/checkbox'
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

type Pane = 'general' | 'timer' | 'sync' | 'statistics' | 'about'

const PANE_ICONS = {
  general: SlidersHorizontal,
  timer: Timer,
  sync: Cloud,
  statistics: BarChart3,
  about: Info,
}

const PANES: { key: Pane; labelKey: MessageKey }[] = [
  { key: 'general', labelKey: 'settings.pane.general' },
  { key: 'timer', labelKey: 'settings.pane.timer' },
  { key: 'sync', labelKey: 'settings.pane.sync' },
  { key: 'statistics', labelKey: 'settings.pane.statistics' },
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
            {pane === 'sync' ? <SyncSettings onExport={exportJson} /> : null}
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

            {pane === 'general' ? (
              <div className="settings-card settings-extra">
                <div className="settings-row">
                  <span className="settings-label">{t('settings.startupPage')}</span>
                  <SelectField
                    aria-label={t('settings.startupPage')}
                    value={settings.startupPage ?? 'create'}
                    onValueChange={(v) => patch({ startupPage: v as Settings['startupPage'] })}
                  >
                    {(['create', 'today', 'all', 'timetable', 'statistics'] as const).map(
                      (key, i) => (
                        <option key={key} value={key}>
                          {t(
                            (
                              [
                                'nav.inbox',
                                'nav.today',
                                'nav.all',
                                'nav.tab.timetable',
                                'nav.statistics',
                              ] as const
                            )[i]!,
                          )}
                        </option>
                      ),
                    )}
                  </SelectField>
                </div>
                <div className="settings-row">
                  <span className="settings-label">{t('settings.defaultPlan')}</span>
                  <SelectField
                    aria-label={t('settings.defaultPlan')}
                    value={String(settings.defaultPlanMinutes ?? 30)}
                    onValueChange={(v) => patch({ defaultPlanMinutes: Number(v) })}
                  >
                    {[15, 30, 45, 60, 90, 120].map((m) => (
                      <option key={m} value={String(m)}>
                        {m} {t('picker.minutesShort')}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div className="settings-row">
                  <span className="settings-label">{t('settings.panelHeight')}</span>
                  <SelectField
                    aria-label={t('settings.panelHeight')}
                    value={String(settings.panelMaxHeight ?? 480)}
                    onValueChange={(v) => patch({ panelMaxHeight: Number(v) })}
                  >
                    {[320, 400, 480, 600].map((h) => (
                      <option key={h} value={String(h)}>
                        {h} px
                      </option>
                    ))}
                  </SelectField>
                </div>
              </div>
            ) : null}
            {pane === 'statistics' ? (
              <div className="settings-card">
                <div className="settings-row">
                  <span className="settings-label">
                    {t('settings.dailyGoal')}
                    <small>{t('settings.dailyGoalHint')}</small>
                  </span>
                  <SelectField
                    aria-label={t('settings.dailyGoal')}
                    value={String(settings.dailyFocusGoal ?? 120)}
                    onValueChange={(v) => patch({ dailyFocusGoal: Number(v) })}
                  >
                    {[30, 60, 90, 120, 180, 240, 360, 480].map((m) => (
                      <option key={m} value={String(m)}>
                        {m} {t('picker.minutesShort')}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div className="settings-row">
                  <span className="settings-label">{t('settings.statsPeriod')}</span>
                  <SelectField
                    aria-label={t('settings.statsPeriod')}
                    value={settings.statisticsPeriod ?? 'week'}
                    onValueChange={(v) =>
                      patch({ statisticsPeriod: v as Settings['statisticsPeriod'] })
                    }
                  >
                    {(['week', 'month', 'year'] as const).map((k) => (
                      <option key={k} value={k}>
                        {t(('stats.' + k) as 'stats.week')}
                      </option>
                    ))}
                  </SelectField>
                </div>
              </div>
            ) : null}
            {pane === 'timer' ? (
              <div className="settings-card">
                <div className="settings-row">
                  <span className="settings-label">
                    {t('settings.autoFocus')}
                    <small>{t('settings.autoFocusHint')}</small>
                  </span>
                  <Checkbox
                    aria-label={t('settings.autoFocus')}
                    checked={settings.autoFocus !== false}
                    onCheckedChange={(v) => patch({ autoFocus: v === true })}
                  />
                </div>
                <div className="settings-row">
                  <span className="settings-label">{t('settings.countdown')}</span>
                  <SelectField
                    aria-label={t('settings.countdown')}
                    disabled={settings.autoFocus === false}
                    value={String(settings.focusCountdown ?? 3)}
                    onValueChange={(v) => patch({ focusCountdown: Number(v) })}
                  >
                    {[0, 3, 5, 10].map((n) => (
                      <option key={n} value={String(n)}>
                        {n === 0 ? t('settings.immediate') : n + ' s'}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <p className="settings-timer-note">{t('work.autoStop')}</p>
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
