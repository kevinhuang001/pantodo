import { useMemo } from 'react'

import { viewDisplayName } from '@/domain/display'
import { colorFor, selectTasks } from '@/domain/filters'
import { paletteFor } from '@/domain/palette'
import { useAppStore } from '@/domain/store'
import type { Project, Tag, Task, View } from '@/domain/types'
import { t } from '@/i18n'

import { Icon } from './Icon'
import type { IconName } from './Icon'

interface SidebarProps {
  now: Date
  theme: 'light' | 'dark'
  onNewProject: () => void
  onNewTag: () => void
  onNewView: () => void
  onEditProject: (project: Project) => void
  onEditTag: (tag: Tag) => void
  onEditView: (view: View) => void
  onOpenSettings: () => void
}

const VIEW_ICONS = new Set<IconName>([
  'inbox',
  'sun',
  'calendar',
  'list',
  'grid',
  'trash',
  'layers',
  'sliders',
  'tag',
])

function viewIcon(icon: string): IconName {
  return VIEW_ICONS.has(icon as IconName) ? (icon as IconName) : 'list'
}

function isOpenTask(task: Task): boolean {
  return (
    task.deletedAt === null &&
    task.archivedAt === null &&
    task.status !== 'done' &&
    task.status !== 'cancelled'
  )
}

export function Sidebar({
  now,
  theme,
  onNewProject,
  onNewTag,
  onNewView,
  onEditProject,
  onEditTag,
  onEditView,
  onOpenSettings,
}: SidebarProps) {
  const views = useAppStore((state) => state.views)
  const projects = useAppStore((state) => state.projects)
  const tags = useAppStore((state) => state.tags)
  const tasks = useAppStore((state) => state.tasks)
  const taskTags = useAppStore((state) => state.taskTags)
  const scheduleBlocks = useAppStore((state) => state.scheduleBlocks)
  const search = useAppStore((state) => state.search)
  const activeTab = useAppStore((state) => state.activeTab)
  const activeViewId = useAppStore((state) => state.activeViewId)
  const tagFilterId = useAppStore((state) => state.tagFilterId)
  const projectFilterId = useAppStore((state) => state.projectFilterId)
  const setSearch = useAppStore((state) => state.setSearch)
  const setActiveTab = useAppStore((state) => state.setActiveTab)
  const setActiveView = useAppStore((state) => state.setActiveView)
  const setTagFilter = useAppStore((state) => state.setTagFilter)
  const setProjectFilter = useAppStore((state) => state.setProjectFilter)
  const resetWorkspace = useAppStore((state) => state.resetWorkspace)

  const palette = paletteFor(theme)
  const context = useMemo(
    () => ({ taskTags, scheduleBlocks, now }),
    [taskTags, scheduleBlocks, now],
  )

  const viewCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const view of views) counts.set(view.id, selectTasks(tasks, view, context).length)
    return counts
  }, [views, tasks, context])

  const projectCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const task of tasks) {
      if (!isOpenTask(task) || task.projectId === null) continue
      counts.set(task.projectId, (counts.get(task.projectId) ?? 0) + 1)
    }
    return counts
  }, [tasks])

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const task of tasks) {
      if (!isOpenTask(task)) continue
      for (const tagId of taskTags[task.id] ?? []) {
        counts.set(tagId, (counts.get(tagId) ?? 0) + 1)
      }
    }
    return counts
  }, [tasks, taskTags])

  const sortedViews = views
    .filter((view) => view.deletedAt === null)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const defaultViews = sortedViews.filter((view) => view.builtin)
  const customViews = sortedViews.filter((view) => !view.builtin)
  const visibleProjects = projects.filter((project) => project.deletedAt === null)
  const visibleTags = tags.filter((tag) => tag.deletedAt === null)

  const renderViewRow = (view: View) => {
    const active = view.id === activeViewId && activeTab === 'views'
    return (
      <div key={view.id} className="nav-row-wrap">
        <button
          type="button"
          className={active ? 'nav-row active' : 'nav-row'}
          aria-current={active ? 'page' : undefined}
          onClick={() => setActiveView(view.id)}
        >
          <Icon name={viewIcon(view.icon)} />
          <span className="nav-label">{viewDisplayName(view, t)}</span>
          <span className="count">{viewCounts.get(view.id) ?? 0}</span>
        </button>
        {view.builtin ? null : (
          <button
            type="button"
            className="icon-button row-action"
            aria-label={t('dialog.editView')}
            title={t('dialog.editView')}
            onClick={() => onEditView(view)}
          >
            <Icon name="pencil" size={13} />
          </button>
        )}
      </div>
    )
  }

  return (
    <aside className="sidebar" aria-label={t('a11y.sidebar')}>
      <div className="sidebar-top">
        <div className="identity">
          <span className="mark">
            <Icon name="calendarCheck" size={20} />
          </span>
          <span className="identity-text">
            <strong>{t('app.name')}</strong>
            <span>{t('app.tagline')}</span>
          </span>
          <span className="identity-actions">
            <button
              type="button"
              className="icon-button"
              title={t('toolbar.settings')}
              aria-label={t('toolbar.settings')}
              onClick={onOpenSettings}
            >
              <Icon name="settings" />
            </button>
          </span>
        </div>

        <div className="search">
          <Icon name="search" size={14} />
          <input
            id="pantodo-search"
            type="search"
            value={search}
            placeholder={t('toolbar.search')}
            aria-label={t('toolbar.search')}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="tabs" role="tablist" aria-label={t('a11y.primaryNav')}>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'views'}
            className={activeTab === 'views' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('views')}
          >
            <Icon name="list" size={14} />
            {t('nav.tab.views')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'timetable'}
            className={activeTab === 'timetable' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('timetable')}
          >
            <Icon name="calendar" size={14} />
            {t('nav.tab.timetable')}
          </button>
        </div>

        <div className="sidebar-scroll">
          {activeTab === 'views' ? (
            <>
              <nav className="sidebar-section" aria-label={t('nav.section.defaultViews')}>
                {defaultViews.map(renderViewRow)}
              </nav>

              <section className="sidebar-section">
                <header className="sidebar-section-head">
                  <span className="eyebrow">{t('nav.section.myViews')}</span>
                  <button
                    type="button"
                    className="icon-button"
                    title={t('nav.newView')}
                    aria-label={t('nav.newView')}
                    onClick={onNewView}
                  >
                    <Icon name="plus" size={14} />
                  </button>
                </header>
                {customViews.length === 0 ? (
                  <p className="sidebar-empty">{t('nav.noViews')}</p>
                ) : (
                  customViews.map(renderViewRow)
                )}
              </section>

              <section className="sidebar-section">
                <header className="sidebar-section-head">
                  <span className="eyebrow">{t('nav.section.projects')}</span>
                  <button
                    type="button"
                    className="icon-button"
                    title={t('nav.newProject')}
                    aria-label={t('nav.newProject')}
                    onClick={onNewProject}
                  >
                    <Icon name="plus" size={14} />
                  </button>
                </header>
                {visibleProjects.length === 0 ? (
                  <p className="sidebar-empty">{t('nav.noProjects')}</p>
                ) : (
                  visibleProjects.map((project) => (
                    <div key={project.id} className="nav-row-wrap">
                      <button
                        type="button"
                        className={projectFilterId === project.id ? 'nav-row active' : 'nav-row'}
                        onClick={() => {
                          setTagFilter(null)
                          setProjectFilter(projectFilterId === project.id ? null : project.id)
                        }}
                      >
                        <span className="dot" style={{ background: colorFor(project, palette) }} />
                        <span className="nav-label">{project.name}</span>
                        <span className="count">{projectCounts.get(project.id) ?? 0}</span>
                      </button>
                      <button
                        type="button"
                        className="icon-button row-action"
                        aria-label={t('task.action.edit')}
                        title={t('task.action.edit')}
                        onClick={() => onEditProject(project)}
                      >
                        <Icon name="pencil" size={13} />
                      </button>
                    </div>
                  ))
                )}
              </section>

              <section className="sidebar-section">
                <header className="sidebar-section-head">
                  <span className="eyebrow">{t('nav.section.tags')}</span>
                  <button
                    type="button"
                    className="icon-button"
                    title={t('nav.newTag')}
                    aria-label={t('nav.newTag')}
                    onClick={onNewTag}
                  >
                    <Icon name="plus" size={14} />
                  </button>
                </header>
                {visibleTags.length === 0 ? (
                  <p className="sidebar-empty">{t('nav.noTags')}</p>
                ) : (
                  visibleTags.map((tag) => (
                    <div key={tag.id} className="nav-row-wrap">
                      <button
                        type="button"
                        className={tagFilterId === tag.id ? 'nav-row active' : 'nav-row'}
                        onClick={() => {
                          setProjectFilter(null)
                          setTagFilter(tagFilterId === tag.id ? null : tag.id)
                        }}
                      >
                        <span className="dot" style={{ background: colorFor(tag, palette) }} />
                        <span className="nav-label">{tag.name}</span>
                        <span className="count">{tagCounts.get(tag.id) ?? 0}</span>
                      </button>
                      <button
                        type="button"
                        className="icon-button row-action"
                        aria-label={t('task.action.edit')}
                        title={t('task.action.edit')}
                        onClick={() => onEditTag(tag)}
                      >
                        <Icon name="pencil" size={13} />
                      </button>
                    </div>
                  ))
                )}
              </section>
            </>
          ) : (
            <p className="sidebar-hint">{t('timetable.placeholder')}</p>
          )}
        </div>
      </div>

      <div className="sidebar-footer">
        <span className="status-dot" />
        <span>{t('status.browserMode')}</span>
        <button
          type="button"
          className="icon-button"
          style={{ marginLeft: 'auto' }}
          title={t('toast.reset')}
          aria-label={t('toast.reset')}
          onClick={() => {
            void resetWorkspace()
          }}
        >
          <Icon name="refresh" size={14} />
        </button>
      </div>
    </aside>
  )
}
