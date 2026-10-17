import { useState } from 'react'
import {
  Cloud,
  Database,
  Download,
  Eye,
  EyeOff,
  LoaderCircle,
  RefreshCw,
  Check,
  Unplug,
} from 'lucide-react'
import { desktop } from '@/platform'
import { getLocale, t, type MessageKey } from '@/i18n'
import { fingerprint } from '@/sync/model'
import { DEFAULT_CONFIG, useSyncStore } from '@/sync/store'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Checkbox } from './ui/checkbox'

export function SyncSettings({ onExport }: { onExport: () => void }) {
  const state = useSyncStore()
  const [draft, setDraft] = useState(state.config)
  const [showPassword, setShowPassword] = useState(false)
  const [saveError, setSaveError] = useState<MessageKey | null>(null)
  const [saved, setSaved] = useState(false)
  const dirty = fingerprint(draft) !== fingerprint(state.config)
  const change = (patch: Partial<typeof draft>) => {
    setDraft({ ...draft, ...patch })
    setSaved(false)
    setSaveError(null)
  }
  const save = () => {
    try {
      state.save(draft)
      setSaved(true)
      setSaveError(null)
    } catch (error) {
      setSaveError(
        error instanceof Error && error.message === 'sync.invalidUrl'
          ? 'sync.invalidUrl'
          : 'sync.storage',
      )
    }
  }
  const statusKey = ('sync.' + state.status) as MessageKey
  return (
    <div className="sync-settings">
      <div className="sync-mode-picker" role="radiogroup" aria-label={t('sync.storageMode')}>
        {(['local', 'webdav'] as const).map((provider) => (
          <button
            type="button"
            role="radio"
            aria-checked={state.provider === provider}
            disabled={state.busy}
            key={provider}
            onClick={() => {
              try {
                state.selectProvider(provider)
              } catch {
                setSaveError('sync.storage')
              }
            }}
          >
            <span className="provider-symbol">
              {provider === 'local' ? <Database size={22} /> : <Cloud size={22} />}
            </span>
            <span>
              <strong>{t(provider === 'local' ? 'sync.localTitle' : 'sync.webdavTitle')}</strong>
              <small>{t(provider === 'local' ? 'sync.localChoice' : 'sync.webdavChoice')}</small>
            </span>
            <span className="provider-check">
              {state.provider === provider ? <Check size={14} /> : null}
            </span>
          </button>
        ))}
      </div>
      {state.provider === 'local' ? (
        <section className="sync-local-card">
          <div className="storage-summary">
            <span className="settings-section-icon">
              <Database size={20} />
            </span>
            <div>
              <h3>{t('sync.localTitle')}</h3>
              <p>{t(desktop ? 'sync.localDesktop' : 'sync.localBrowser')}</p>
            </div>
          </div>
          <div className="local-export">
            <div>
              <strong>{t('settings.export')}</strong>
              <p>{t('settings.exportHint')}</p>
            </div>
            <Button variant="outline" onClick={onExport}>
              <Download size={15} />
              {t('settings.export')}
            </Button>
          </div>
        </section>
      ) : null}
      {state.provider === 'webdav' ? (
        <section className="sync-provider">
          <div className="settings-section-heading">
            <Cloud size={19} />
            <h3>{t('sync.webdavTitle')}</h3>
          </div>
          <p className="settings-description">{t('sync.webdavHint')}</p>
          <form
            className="sync-form"
            onSubmit={(event) => {
              event.preventDefault()
              save()
            }}
          >
            <fieldset disabled={state.busy}>
              <div className="field">
                <label htmlFor="dav-url">{t('sync.url')}</label>
                <Input
                  id="dav-url"
                  type="url"
                  required
                  placeholder={t('sync.urlPlaceholder')}
                  value={draft.url}
                  spellCheck={false}
                  autoCapitalize="none"
                  onChange={(event) => change({ url: event.target.value })}
                />
              </div>
              <div className="sync-credentials">
                <div className="field">
                  <label htmlFor="dav-user">{t('sync.username')}</label>
                  <Input
                    id="dav-user"
                    autoComplete="username"
                    value={draft.username}
                    spellCheck={false}
                    autoCapitalize="none"
                    onChange={(event) => change({ username: event.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="dav-password">{t('sync.password')}</label>
                  <div className="password-input">
                    <Input
                      id="dav-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={draft.password}
                      onChange={(event) => change({ password: event.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t(showPassword ? 'sync.hidePassword' : 'sync.showPassword')}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </Button>
                  </div>
                </div>
              </div>
              <p className="settings-note">{t('sync.credentialsHint')}</p>
              <label className="sync-auto" htmlFor="dav-auto">
                <Checkbox
                  id="dav-auto"
                  checked={draft.autoSync}
                  onCheckedChange={(checked) => change({ autoSync: checked === true })}
                />
                <span>
                  <strong>{t('sync.auto')}</strong>
                  <small>{t('sync.autoHint')}</small>
                </span>
              </label>
              <div className="sync-form-actions">
                <Button
                  variant="outline"
                  type="button"
                  disabled={!draft.url.trim()}
                  onClick={() => void state.test(draft)}
                >
                  {state.status === 'testing' ? <LoaderCircle size={14} className="spin" /> : null}
                  {t('sync.test')}
                </Button>
                <Button type="submit" disabled={!draft.url.trim() || (!dirty && !saved)}>
                  {saved && !dirty ? <Check size={14} /> : null}
                  {t(saved && !dirty ? 'sync.saved' : 'sync.save')}
                </Button>
              </div>
            </fieldset>
          </form>
          {saveError ? (
            <p role="alert" className="sync-feedback error">
              {t(saveError)}
            </p>
          ) : null}
          {state.config.url ? (
            <div className="sync-status-card">
              <div className="sync-status-line">
                <span className={'sync-status-dot ' + state.status} />
                <div>
                  <strong>
                    {state.status === 'error'
                      ? t(state.error ?? 'sync.network')
                      : state.status === 'conflict'
                        ? t('sync.conflict', { count: state.conflicts.length })
                        : t(statusKey)}
                  </strong>
                  {state.lastSyncAt ? (
                    <small>
                      {t('sync.lastSync', {
                        time: new Date(state.lastSyncAt).toLocaleString(getLocale(), {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }),
                      })}
                    </small>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={state.busy || dirty}
                  onClick={() => void state.sync()}
                >
                  <RefreshCw size={14} className={state.status === 'syncing' ? 'spin' : ''} />
                  {t('sync.now')}
                </Button>
              </div>
              {state.conflicts.length ? (
                <div className="sync-conflicts">
                  <p>{t('sync.conflictHint')}</p>
                  <ul>
                    {state.conflicts.map((conflict) => (
                      <li key={conflict.key}>{conflict.title}</li>
                    ))}
                  </ul>
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={state.busy || dirty}
                      onClick={() => void state.sync('local')}
                    >
                      {t('sync.keepLocal')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={state.busy || dirty}
                      onClick={() => void state.sync('remote')}
                    >
                      {t('sync.keepRemote')}
                    </Button>
                  </div>
                </div>
              ) : null}
              <div className="sync-disconnect">
                <small>{t('sync.disconnectHint')}</small>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={state.busy}
                  onClick={() => {
                    try {
                      state.disconnect()
                      setDraft(DEFAULT_CONFIG)
                      setSaved(false)
                      setSaveError(null)
                    } catch {
                      setSaveError('sync.storage')
                    }
                  }}
                >
                  <Unplug size={13} />
                  {t('sync.disconnect')}
                </Button>
              </div>
            </div>
          ) : state.status !== 'idle' ? (
            <p
              className={'sync-feedback ' + (state.status === 'error' ? 'error' : '')}
              role={state.status === 'error' ? 'alert' : 'status'}
            >
              {t(state.status === 'error' ? (state.error ?? 'sync.network') : statusKey)}
            </p>
          ) : null}
          {!desktop ? (
            <p className="settings-note browser-sync-note">{t('sync.browserHint')}</p>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
