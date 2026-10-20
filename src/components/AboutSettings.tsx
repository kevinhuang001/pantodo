import { useState } from 'react'
import { RefreshCw, ExternalLink } from 'lucide-react'
import { t, type MessageKey } from '@/i18n'
import { checkForUpdates, newerVersion, openRelease, type Release } from '@/updates'
import { version } from '../../package.json'
import { Button } from './ui/button'

export function AboutSettings() {
  const [busy, setBusy] = useState(false)
  const [release, setRelease] = useState<Release | null>(null)
  const [error, setError] = useState<MessageKey | null>(null)
  const available = release && newerVersion(release.version, version)
  const check = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    setRelease(null)
    try {
      setRelease(await checkForUpdates())
    } catch (e) {
      const message = e instanceof Error ? e.message : typeof e === 'string' ? e : ''
      const known = ['about.updateInvalid', 'about.updateLimited', 'about.updateUnavailable']
      setError((known.includes(message) ? message : 'about.updateFailed') as MessageKey)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="settings-card about-settings">
      <div className="settings-row">
        <span className="settings-label">{t('app.name')}</span>
        <span className="count">v{version}</span>
      </div>
      <div className="settings-row">
        <span className="settings-label">{t('about.updates')}</span>
        <Button variant="outline" disabled={busy} aria-busy={busy} onClick={() => void check()}>
          <RefreshCw size={15} className={busy ? 'spin' : ''} />
          {t(busy ? 'about.checking' : 'about.checkUpdates')}
        </Button>
      </div>
      <div
        role={error ? 'alert' : 'status'}
        aria-live="polite"
        className={'sync-feedback ' + (error ? 'error' : '')}
      >
        {error
          ? t(error)
          : release
            ? available
              ? t('about.updateAvailable', { version: release.version })
              : t('about.upToDate')
            : null}
      </div>
      {available ? (
        <Button
          variant="outline"
          onClick={() => {
            void openRelease(release).catch(() => setError('about.openFailed'))
          }}
        >
          <ExternalLink size={15} />
          {t('about.download')}
        </Button>
      ) : null}
    </div>
  )
}
