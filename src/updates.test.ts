import { afterEach, expect, it, vi } from 'vitest'
import { checkForUpdates, newerVersion, parseRelease } from './updates'

afterEach(() => vi.unstubAllGlobals())
it('compares versions numerically and never downgrades', () => {
  expect(newerVersion('v0.6.14', '0.6.13')).toBe(true)
  expect(newerVersion('0.10.0', '0.9.9')).toBe(true)
  expect(newerVersion('0.6.13', '0.6.13')).toBe(false)
  expect(newerVersion('0.6.12', '0.6.13')).toBe(false)
})
it('validates stable releases and builds only repository release links', () => {
  expect(parseRelease('{"tag_name":"v0.6.14","html_url":"https://example.com"}')).toEqual({
    version: '0.6.14',
    url: 'https://github.com/kevinhuang001/pantodo/releases/tag/v0.6.14',
  })
  for (const value of [
    '{}',
    'not json',
    '{"tag_name":"v1.2.3","draft":true}',
    '{"tag_name":"v1.2.3-beta"}',
  ]) {
    expect(() => parseRelease(value)).toThrow('about.updateInvalid')
  }
})
it.each([
  [403, 'about.updateLimited'],
  [429, 'about.updateLimited'],
  [404, 'about.updateUnavailable'],
  [500, 'about.updateFailed'],
])('reports release service failure %s', async (status, message) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status })))
  await expect(checkForUpdates()).rejects.toThrow(message)
})
