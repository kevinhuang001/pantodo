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
  it('seeds four built-in views, the quadrant example and a trash view', () => {
    const workspace = createSeedWorkspace()
    const presets = workspace.views.map((view) => view.preset)
    expect(presets).toEqual(['inbox', 'today', 'upcoming', 'all', null, 'trash'])
  })

  it('seeds the Eisenhower example as an ordinary 2x2 view over pinned tag groups', () => {
    const workspace = createSeedWorkspace()
    const quadrant = workspace.views.find((view) => view.groups.length === 4)

    expect(quadrant).toBeDefined()
    expect(quadrant?.builtin).toBe(true)
    expect(quadrant?.layout).toBe('board')
    expect(quadrant?.groupBy).toBe('tag')
    expect(quadrant?.arrangement).toBe('grid')
    expect(quadrant?.gridColumns).toBe(2)
    expect(quadrant?.groups).toHaveLength(4)
    expect(quadrant?.groups.map((group) => group.sortOrder)).toEqual([0, 1, 2, 3])

    const [important, urgent] = workspace.tags
    expect(workspace.tags).toHaveLength(2)
    expect(important?.name).toBe('重要')
    expect(urgent?.name).toBe('紧急')

    const rules = quadrant?.groups.map((group) => group.rule)
    expect(rules?.[0]).toEqual({
      tagIds: [important?.id, urgent?.id],
      tagMode: 'all',
      excludeTagIds: [],
    })
    expect(rules?.[1]?.excludeTagIds).toEqual([urgent?.id])
    expect(rules?.[2]?.excludeTagIds).toEqual([important?.id])
    expect(rules?.[3]).toEqual({
      tagIds: [],
      tagMode: 'all',
      excludeTagIds: [important?.id, urgent?.id],
    })
  })

  it('starts empty apart from views and tags', () => {
    const workspace = createSeedWorkspace()
    expect(workspace.tasks).toEqual([])
    expect(workspace.projects).toEqual([])
    expect(workspace.scheduleBlocks).toEqual([])
    expect(workspace.taskTags).toEqual({})
  })

  it('adds sample content for the browser fixture only', () => {
    const workspace = createSeedWorkspace({ withDemoData: true })
    expect(workspace.tasks.length).toBeGreaterThan(5)
    expect(workspace.projects).toHaveLength(1)
    expect(workspace.scheduleBlocks.length).toBeGreaterThan(2)
    expect(workspace.tags.length).toBeGreaterThan(2)
    for (const task of workspace.tasks) {
      expect(workspace.taskTags[task.id]).toBeDefined()
    }
  })

  it('seeds labels in the language active at first run', () => {
    const workspace = createSeedWorkspace({ t: (key) => `[${key}]` })
    expect(workspace.views[0]?.name).toBe('[nav.inbox]')
    expect(workspace.tags[0]?.name).toBe('[seed.tagImportant]')
    expect(workspace.views.find((view) => view.groups.length === 4)?.groups[0]?.label).toBe(
      '[quadrant.importantUrgent]',
    )
  })
})
