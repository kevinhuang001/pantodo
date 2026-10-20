import { expect, it } from 'vitest'
import { syncInterval, type WebDavConfig } from './transport'

it('defaults missing intervals and constrains invalid saved intervals', () => {
  const config: WebDavConfig = { url: '', username: '', password: '', autoSync: true }
  expect(syncInterval(config)).toBe(60)
  expect(syncInterval({ ...config, intervalSeconds: 120 })).toBe(120)
  expect(syncInterval({ ...config, intervalSeconds: NaN })).toBe(60)
  expect(syncInterval({ ...config, intervalSeconds: -1 })).toBe(30)
  expect(syncInterval({ ...config, intervalSeconds: 999999 })).toBe(86400)
})
