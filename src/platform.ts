import { isTauri } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'

export const desktop = isTauri()

export async function setFullscreen(fullscreen: boolean): Promise<void> {
  if (desktop) await getCurrentWindow().setFullscreen(fullscreen)
  else if (fullscreen && !document.fullscreenElement)
    await document.documentElement.requestFullscreen()
  else if (!fullscreen && document.fullscreenElement) await document.exitFullscreen()
}

export async function onFullscreenExit(callback: () => void): Promise<() => void> {
  if (desktop) {
    const window = getCurrentWindow()
    let check: ReturnType<typeof setTimeout> | undefined
    const unlisten = await window.onResized(() => {
      clearTimeout(check)
      check = setTimeout(() => {
        void window.isFullscreen().then((fullscreen) => {
          if (!fullscreen) callback()
        })
      }, 200)
    })
    return () => {
      clearTimeout(check)
      unlisten()
    }
  }
  const listener = () => {
    if (!document.fullscreenElement) callback()
  }
  document.addEventListener('fullscreenchange', listener)
  return () => document.removeEventListener('fullscreenchange', listener)
}
