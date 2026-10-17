import { useEffect, useState } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Minus, Square, Copy, X } from 'lucide-react'
import { desktop } from '@/platform'
import { useAppStore } from '@/domain/store'
import { t } from '@/i18n'
export function WindowChrome() {
  const [maximized, setMaximized] = useState(false)
  const mac = /Mac/.test(navigator.platform)
  useEffect(() => {
    if (!desktop) return
    const win = getCurrentWindow()
    let disposed = false
    let off: (() => void) | undefined
    const sync = () => {
      void win
        .isMaximized()
        .then((value) => {
          if (!disposed) setMaximized(value)
        })
        .catch(() => {})
    }
    sync()
    void win.onResized(sync).then((unlisten) => {
      if (disposed) unlisten()
      else off = unlisten
    })
    return () => {
      disposed = true
      off?.()
    }
  }, [])
  const action = (kind: 'close' | 'minimize' | 'maximize') => {
    if (!desktop) return
    const win = getCurrentWindow()
    const operation =
      kind === 'close' ? win.close() : kind === 'minimize' ? win.minimize() : win.toggleMaximize()
    void operation.catch(() => useAppStore.getState().notify('work.failed'))
  }
  return (
    <div className={'window-chrome ' + (mac ? 'is-mac' : 'is-other')}>
      <div
        className="window-drag"
        onMouseDown={(e) => {
          if (e.button !== 0 || !desktop) return
          if (e.detail === 2) {
            action('maximize')
            return
          }
          if (desktop)
            void getCurrentWindow()
              .startDragging()
              .catch(() => {})
        }}
      />
      <div className="window-controls">
        {(mac
          ? (['close', 'minimize', 'maximize'] as const)
          : (['minimize', 'maximize', 'close'] as const)
        ).map((kind) => (
          <button
            type="button"
            key={kind}
            className={'window-control ' + kind}
            aria-label={t(
              kind === 'maximize' && maximized
                ? 'window.restore'
                : (('window.' + kind) as 'window.close'),
            )}
            title={t(
              kind === 'maximize' && maximized
                ? 'window.restore'
                : (('window.' + kind) as 'window.close'),
            )}
            onClick={() => action(kind)}
          >
            {kind === 'close' ? (
              <X size={13} />
            ) : kind === 'minimize' ? (
              <Minus size={13} />
            ) : maximized ? (
              <Copy size={11} />
            ) : (
              <Square size={11} />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
