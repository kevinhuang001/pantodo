import { createBrowserBridge } from './browser'
import type { Bridge } from './types'

export type { Bridge } from './types'
export { STORAGE_KEY } from './browser'

/**
 * The desktop build will replace this with the Tauri IPC implementation in M2 — the surface is
 * already identical (`src-tauri` commands mirror `Bridge`), so nothing above this line changes.
 */
export function createBridge(): Bridge {
  return createBrowserBridge()
}
