import { describe, expect, it } from 'vitest'
import { createSeedWorkspace } from '@/domain/presets'
import { applyData, emptyData, extractData, fingerprint, mergeData, parseDocument } from './model'
import type { TimeEntry } from '@/domain/types'
const workspace = () =>
  createSeedWorkspace({ withDemoData: true, now: new Date('2026-10-17T08:00:00Z') })

describe('WebDAV data protocol', () => {
  it('only syncs user data, not credentials, live timers, settings or built-in navigation', () => {
    const w = workspace(),
      data = extractData(w)
    expect(Object.values(data.views)).toHaveLength(1)
    expect(Object.values(data.views).every((view) => !view?.builtin)).toBe(true)
    expect(data).not.toHaveProperty('timer')
    expect(data).not.toHaveProperty('settings')
    expect(
      parseDocument(JSON.stringify({ format: 'pantodo-webdav', version: 1, data })).data,
    ).toEqual(data)
    expect(applyData(w, data).settings).toBe(w.settings)
    expect(applyData(w, data).views.filter((view) => view.builtin)).toEqual(
      w.views.filter((view) => view.builtin),
    )
  })
  it('accepts UTF-8 BOM and the app’s own workspace export without syncing local settings', () => {
    const w = workspace()
    const parsed = parseDocument('\uFEFF' + JSON.stringify(w))
    expect(parsed.data).toEqual(extractData(w))
    expect(parsed.data).not.toHaveProperty('settings')
    expect(() => parseDocument(JSON.stringify({ ...w, tasks: [...w.tasks, w.tasks[0]] }))).toThrow(
      'sync.invalidData',
    )
  })
  it('fills omitted presentation defaults but rejects explicit invalid view settings', () => {
    const data = extractData(workspace())
    const view = Object.values(data.views)[0]!
    delete (view as Partial<typeof view>).columnCount
    const raw = () => JSON.stringify({ format: 'pantodo-webdav', version: 1, data })
    expect(Object.values(parseDocument(raw()).data.views)[0]!.columnCount).toBe(2)
    view.columnCount = 0
    expect(() => parseDocument(raw())).toThrow('sync.invalidData')
  })
  it('merges separate-device edits and task tag assignments', () => {
    const b = extractData(workspace()),
      l = structuredClone(b),
      r = structuredClone(b)
    const ids = Object.keys(b.tasks)
    l.tasks[ids[0]]!.task.title = 'Local title'
    r.tasks[ids[1]]!.tagIds = ['remote-tag']
    const result = mergeData(b, l, r)
    expect(result.conflicts).toEqual([])
    expect(result.data.tasks[ids[0]]!.task.title).toBe('Local title')
    expect(result.data.tasks[ids[1]]!.tagIds).toEqual(['remote-tag'])
  })
  it('requires a choice when both devices edit the same task and includes tags in the conflict', () => {
    const b = extractData(workspace()),
      l = structuredClone(b),
      r = structuredClone(b)
    const id = Object.keys(b.tasks)[0]
    l.tasks[id]!.task.title = 'Local'
    r.tasks[id]!.tagIds = ['remote']
    const preview = mergeData(b, l, r)
    expect(preview.conflicts).toHaveLength(1)
    expect(mergeData(b, l, r, { [preview.conflicts[0].key]: 'remote' }).data.tasks[id]).toEqual(
      r.tasks[id],
    )
  })
  it('keeps permanent-deletion tombstones and does not resurrect an offline task', () => {
    const w = workspace(),
      base = extractData(w),
      id = w.tasks[0].id
    w.tasks = w.tasks.filter((task) => task.id !== id)
    const deleted = extractData(w, base)
    expect(deleted.tasks[id]).toBeNull()
    expect(mergeData(base, base, deleted).data.tasks[id]).toBeNull()
    const freshDevice = emptyData()
    expect(mergeData(emptyData(), freshDevice, deleted).data.tasks[id]).toBeNull()
  })
  it('turns missing remote records into permanent-deletion markers', () => {
    const b = extractData(workspace()),
      r = structuredClone(b),
      id = Object.keys(b.tasks)[0]
    delete r.tasks[id]
    expect(mergeData(b, b, r).data.tasks[id]).toBeNull()
  })
  it('asks before resolving a remote deletion against a local edit', () => {
    const b = extractData(workspace()),
      l = structuredClone(b),
      r = structuredClone(b),
      id = Object.keys(b.tasks)[0]
    l.tasks[id]!.task.title = 'Edited offline'
    r.tasks[id] = null
    expect(mergeData(b, l, r).conflicts).toHaveLength(1)
  })
  it('preserves edits made during a network request when applying a merged snapshot', () => {
    const b = extractData(workspace()),
      sent = structuredClone(b),
      current = structuredClone(b)
    const [a, c] = Object.keys(b.tasks)
    sent.tasks[a]!.task.title = 'Remote'
    current.tasks[a]!.task.title = 'New local while syncing'
    sent.tasks[c]!.task.title = 'Unrelated remote'
    const preview = mergeData(b, current, sent)
    const result = mergeData(
      b,
      current,
      sent,
      Object.fromEntries(preview.conflicts.map((conflict) => [conflict.key, 'local'])),
    )
    expect(result.data.tasks[a]!.task.title).toBe('New local while syncing')
    expect(result.data.tasks[c]!.task.title).toBe('Unrelated remote')
  })
  it('detects overlapping time recorded offline and tombstones the unchosen entry', () => {
    const b = emptyData(),
      l = emptyData(),
      r = emptyData()
    const entry: TimeEntry = {
      id: 'local-time',
      createdAt: '2026-10-17T10:00:00Z',
      updatedAt: '2026-10-17T10:00:00Z',
      deletedAt: null,
      taskId: null,
      startedAt: '2026-10-17T08:00:00Z',
      endedAt: '2026-10-17T09:00:00Z',
      source: 'manual',
      note: 'Local work',
    }
    l.timeEntries[entry.id] = entry
    r.timeEntries['remote-time'] = {
      ...entry,
      id: 'remote-time',
      startedAt: '2026-10-17T08:30:00Z',
      endedAt: '2026-10-17T09:30:00Z',
      note: 'Remote work',
    }
    const preview = mergeData(b, l, r)
    expect(preview.conflicts).toHaveLength(1)
    const result = mergeData(b, l, r, { [preview.conflicts[0].key]: 'local' })
    expect(result.data.timeEntries['remote-time']!.deletedAt).not.toBeNull()
    expect(result.data.timeEntries['local-time']!.deletedAt).toBeNull()
  })
  it('rejects invalid documents before they reach local persistence', () => {
    const data = extractData(workspace())
    const raw = () => JSON.stringify({ format: 'pantodo-webdav', version: 1, data })
    expect(() => parseDocument('not JSON')).toThrow('sync.invalidData')
    data.tasks[Object.keys(data.tasks)[0]]!.task.status = 'broken' as never
    expect(() => parseDocument(raw())).toThrow('sync.invalidData')
    expect(() =>
      parseDocument(
        '{"format":"pantodo-webdav","version":1,"data":{"projects":{"__proto__":null},"tags":{},"tasks":{},"views":{},"timeEntries":{}}}',
      ),
    ).toThrow('sync.invalidData')
  })
  it('has deterministic first-launch identities across devices', () => {
    expect(extractData(createSeedWorkspace())).toEqual(extractData(createSeedWorkspace()))
    expect(fingerprint({ b: 1, a: [2, 3] })).toBe(fingerprint({ a: [2, 3], b: 1 }))
  })
})
