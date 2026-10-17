import { createBrowserBridge } from './browser'
import { createTauriBridge } from './tauri'
import { desktop } from '@/platform'
import type { Bridge } from './types'

export type { Bridge } from './types'
export { STORAGE_KEY } from './browser'

/** Local workspace persistence implementation. */
export function createBridge(): Bridge {
  return desktop ? createTauriBridge() : createBrowserBridge()
}
