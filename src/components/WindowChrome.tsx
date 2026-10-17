import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Minus, Square, Copy, X } from 'lucide-react'
import { desktop } from '@/platform'
import { beginWindowDrag, browserPlatform, reportWindowError } from '@/window'
import { t } from '@/i18n'
const EDGES = [
  'North',
  'NorthEast',
  'East',
  'SouthEast',
  'South',
  'SouthWest',
  'West',
  'NorthWest',
] as const
export function WindowChrome() {
  const [maximized, setMaximized] = useState(false)
  const [platform, setPlatform] = useState(browserPlatform)
  const mac = platform === 'macos'
  useEffect(() => {
    document.documentElement.dataset.platform = platform
    document.documentElement.dataset.desktop = String(desktop)
  }, [platform])
  useEffect(() => {
    document.documentElement.dataset.maximized = String(maximized)
  }, [maximized])
  useEffect(() => {
    if (!desktop) return
    let disposed = false
    let off: (() => void) | undefined
    void invoke<string>('desktop_platform')
      .then((value) => {
        if (!disposed) setPlatform(value)
      })
      .catch(() => {})
    const win = getCurrentWindow()
    const sync = () => {
      void win
        .isMaximized()
        .then((value) => {
          if (!disposed) setMaximized(value)
        })
        .catch(reportWindowError)
    }
    sync()
    void win
      .onResized(sync)
      .then((fn) => {
        if (disposed) fn()
        else off = fn
      })
      .catch(reportWindowError)
    return () => {
      disposed = true
      off?.()
    }
  }, [])
  const action = (kind: 'close' | 'minimize' | 'maximize') => {
    if (!desktop) return
    const win = getCurrentWindow()
    void (
      kind === 'close' ? win.close() : kind === 'minimize' ? win.minimize() : win.toggleMaximize()
    ).catch(reportWindowError)
  }
  return (
    <>
      <div className={'window-chrome ' + (mac ? 'is-mac' : 'is-other')}>
        <div className="window-drag" onMouseDown={beginWindowDrag} />
        <div className="window-controls" role="group" aria-label="Window">
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
                <X size={12} />
              ) : kind === 'minimize' ? (
                <Minus size={12} />
              ) : maximized ? (
                <Copy size={10} />
              ) : (
                <Square size={10} />
              )}
            </button>
          ))}
        </div>
      </div>
      {!maximized
        ? EDGES.map((edge) => (
            <div
              key={edge}
              className={'window-resize edge-' + edge}
              data-resize-edge={edge}
              aria-hidden="true"
              onMouseDown={(event) => {
                if (!desktop || event.button !== 0) return
                event.preventDefault()
                event.stopPropagation()
                void getCurrentWindow().startResizeDragging(edge).catch(reportWindowError)
              }}
            />
          ))
        : null}
    </>
  )
}
