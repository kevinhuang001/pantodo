import { isTauri } from '@tauri-apps/api/core'
export const desktop =
  isTauri() || (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window)
