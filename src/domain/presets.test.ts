import { describe, expect, it } from 'vitest'

import { createSeedWorkspace, defaultSettings } from './presets'

describe('defaultSettings', () => {
  it('uses the agreed defaults', () => {
    const settings = defaultSettings()
    expect(settings.theme).toBe('system')
    expect(settings.localePreference).toBe('system')
    expect(settings.weekStartsOn).toBe(1)
    expect(settings.reminderLeadMinutes).toBe(20)
    expect(settings.notificationsSilent).toBe(true)
  })
})

describe('createSeedWorkspace', () => {
  it('seeds four navigation views and an editable panel workbench', () => {
    const workspace = createSeedWorkspace()
    expect(workspace.views.map((view) => view.preset)).toEqual([
      'inbox',
      'today',
      'all',
      'trash',
      null,
    ])
    const workbench = workspace.views.find((view) => view.preset === null)
    expect(workbench?.builtin).toBe(false)
    expect(workbench?.panels).toHaveLength(3)
  })

  it('starts empty apart from views and tags', () => {
    const workspace = createSeedWorkspace()
    expect(workspace.tasks).toEqual([])
    expect(workspace.projects).toEqual([])
    expect(workspace.timeEntries).toEqual([])
    expect(workspace.timer).toBeNull()
    expect(workspace.taskTags).toEqual({})
  })

  it('adds sample content for the browser fixture only', () => {
    const workspace = createSeedWorkspace({ withDemoData: true })
    expect(workspace.tasks.length).toBeGreaterThan(5)
    expect(workspace.projects).toHaveLength(1)
    expect(workspace.tasks.filter((task) => task.startAt && task.endAt).length).toBeGreaterThan(2)
    expect(workspace.tags.length).toBeGreaterThan(2)
    for (const task of workspace.tasks) {
      expect(workspace.taskTags[task.id]).toBeDefined()
    }
  })

  it('seeds labels in the language active at first run', () => {
    const workspace = createSeedWorkspace({ t: (key) => `[${key}]` })
    expect(workspace.views[0]?.name).toBe('[nav.inbox]')
    expect(workspace.tags[0]?.name).toBe('[seed.tagImportant]')
  })
})
