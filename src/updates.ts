import { invoke } from '@tauri-apps/api/core'
import { desktop } from '@/platform'

export const RELEASES_URL = 'https://github.com/kevinhuang001/pantodo/releases'
const LATEST_URL = 'https://api.github.com/repos/kevinhuang001/pantodo/releases/latest'
export interface Release {
  version: string
  url: string
}
function versionParts(version: string): number[] {
  if (!/^v?\d+\.\d+\.\d+$/.test(version)) throw new Error('about.updateInvalid')
  const parts = version.replace(/^v/, '').split('.').map(Number)
  if (!parts.every(Number.isSafeInteger)) throw new Error('about.updateInvalid')
  return parts
}
export function newerVersion(candidate: string, current: string): boolean {
  const a = versionParts(candidate),
    b = versionParts(current)
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i]
  }
  return false
}
export function parseRelease(raw: string): Release {
  let release: unknown
  try {
    release = JSON.parse(raw)
  } catch {
    throw new Error('about.updateInvalid')
  }
  if (
    !release ||
    typeof release !== 'object' ||
    !('tag_name' in release) ||
    typeof release.tag_name !== 'string' ||
    ('draft' in release && release.draft) ||
    ('prerelease' in release && release.prerelease)
  )
    throw new Error('about.updateInvalid')
  versionParts(release.tag_name)
  return {
    version: release.tag_name.replace(/^v/, ''),
    url: `${RELEASES_URL}/tag/${release.tag_name}`,
  }
}
export async function checkForUpdates(): Promise<Release> {
  if (desktop) {
    const body = await invoke<string>('check_for_updates')
    return parseRelease(body)
  }
  const response = await fetch(LATEST_URL, {
    headers: { Accept: 'application/vnd.github+json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  })
  if (response.status === 403 || response.status === 429) throw new Error('about.updateLimited')
  if (response.status === 404) throw new Error('about.updateUnavailable')
  if (!response.ok) throw new Error('about.updateFailed')
  return parseRelease(await response.text())
}
export async function openRelease(release: Release): Promise<void> {
  if (desktop) await invoke('open_release', { version: release.url.split('/').at(-1) })
  else window.open(release.url, '_blank', 'noopener,noreferrer')
}
