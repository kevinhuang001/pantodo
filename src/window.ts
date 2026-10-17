import type { MouseEvent } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { desktop } from './platform'
import { useAppStore } from './domain/store'
export function reportWindowError() {
  useAppStore.getState().notify('window.actionFailed')
}
/** Only blank title/sidebar chrome starts an OS drag; form controls keep their usual behavior. */
export function beginWindowDrag(event: MouseEvent<HTMLElement>) {
  if (!desktop || event.button !== 0) return
  if (
    (event.target as HTMLElement).closest(
      'button,input,textarea,[role="button"],[role="combobox"],a,summary',
    )
  )
    return
  event.preventDefault()
  const win = getCurrentWindow()
  void (event.detail === 2 ? win.toggleMaximize() : win.startDragging()).catch(reportWindowError)
}
export function browserPlatform() {
  const hint = [navigator.platform, navigator.userAgent].join(' ')
  return /Macintosh|MacIntel|Mac OS X/i.test(hint)
    ? 'macos'
    : /Windows|Win32|Win64/i.test(hint)
      ? 'windows'
      : 'linux'
}
