import { invoke } from '@tauri-apps/api/core'
import { desktop } from '@/platform'

export interface WebDavConfig {
  url: string
  username: string
  password: string
  autoSync: boolean
}
export interface DavResponse {
  status: number
  body: string
  etag: string | null
}
export const MAX_SYNC_BYTES = 32 * 1024 * 1024
export function syncFileUrl(directory: string): string {
  try {
    const url = new URL(directory.trim())
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error()
    url.pathname = url.pathname.replace(/\/*$/, '/') + 'pantodo-workspace.json'
    return url.href
  } catch {
    throw new Error('sync.invalidUrl')
  }
}
export async function davRequest(
  config: WebDavConfig,
  method: 'GET' | 'PUT',
  body?: string,
  etag?: string | null,
): Promise<DavResponse> {
  const url = syncFileUrl(config.url)
  if (body && new TextEncoder().encode(body).byteLength > MAX_SYNC_BYTES)
    throw new Error('sync.tooLarge')
  try {
    if (desktop)
      return await invoke<DavResponse>('webdav_request', {
        url,
        username: config.username,
        password: config.password,
        method,
        body: body ?? null,
        etag: etag ?? null,
      })
    const headers: Record<string, string> = {}
    if (config.username || config.password) {
      const bytes = new TextEncoder().encode(config.username + ':' + config.password)
      headers.Authorization =
        'Basic ' + btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))
    }
    if (method === 'PUT') {
      headers['Content-Type'] = 'application/json'
      headers[etag ? 'If-Match' : 'If-None-Match'] = etag || '*'
    }
    const response = await fetch(url, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(20_000),
      redirect: 'error',
      credentials: 'omit',
      cache: 'no-store',
    })
    const length = Number(response.headers.get('Content-Length'))
    if (length > MAX_SYNC_BYTES) throw new Error('sync.tooLarge')
    let text = ''
    if (method === 'GET' && response.status === 200 && response.body) {
      const reader = response.body.getReader(),
        decoder = new TextDecoder()
      let size = 0
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > MAX_SYNC_BYTES) {
          await reader.cancel()
          throw new Error('sync.tooLarge')
        }
        text += decoder.decode(value, { stream: true })
      }
      text += decoder.decode()
    }
    return { status: response.status, body: text, etag: response.headers.get('ETag') }
  } catch (error) {
    const message = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
    if (['sync.invalidUrl', 'sync.tooLarge', 'sync.noEtag', 'sync.network'].includes(message))
      throw new Error(message)
    // Never surface request URLs, authorization values or server error bodies.
    throw new Error(desktop ? 'sync.network' : 'sync.browserNetwork')
  }
}
export function checkStatus(status: number): void {
  if (status === 401 || status === 403) throw new Error('sync.auth')
  if (status >= 300) throw new Error(status === 409 ? 'sync.directory' : 'sync.server')
}
export function strongEtag(etag: string | null): etag is string {
  return !!etag && /^"[^"\r\n]*"$/.test(etag)
}
