import { useEffect, useMemo, useState } from 'react'

import { useDebounced, useFilterContext, useNow } from '@/hooks'
import { groupTasks, selectTasks, sortTasks } from '@/domain/filters'
import { paletteFor } from '@/domain/palette'
import { useAppStore } from '@/domain/store'
import { applyTheme, resolveTheme, systemPrefersDark } from '@/domain/theme'
import type { Project, ResolvedTheme, Tag, Task, ThemePreference, View } from '@/domain/types'
import { nextStatus } from '@/domain/types'
import { t } from '@/i18n'

import { ConfirmDialog } from './components/ConfirmDialog'
import { EmptyState } from './components/EmptyState'
import { EntityDialog } from './components/EntityDialog'
import { GroupBoard } from './components/GroupBoard'
import { Icon } from './components/Icon'
import { PanelPreview } from './components/PanelPreview'
import { PaperFriend } from './components/PaperFriend'
import { InboxComposer } from './components/InboxComposer'
import { SettingsDialog } from './components/SettingsDialog'
import { Sidebar } from './components/Sidebar'
import { TaskDialog } from './components/TaskDialog'
import type { TaskLookup } from './components/TaskList'
import { Timetable } from './components/Timetable'
import { Toast } from './components/Toast'
import { Toolbar } from './components/Toolbar'
import { ViewDialog } from './components/ViewDialog'

type DialogState =
  | { kind: 'task'; task: Task | null }
  | { kind: 'entity'; entityKind: 'project' | 'tag'; entity: Project | Tag | null }
  | { kind: 'view'; view: View | null }
  | { kind: 'confirm-delete'; task: Task }
  | { kind: 'confirm-empty-trash' }
  | { kind: 'settings' }
  | null

function useResolvedTheme(preference: ThemePreference): ResolvedTheme {
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (): void => setSystemDark(media.matches)
    setSystemDark(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const theme = resolveTheme(preference, systemDark)
  useEffect(() => {
    applyTheme(theme)
  }, [theme])
  return theme
}

export function App() {
  const ready = useAppStore((state) => state.ready)
  const error = useAppStore((state) => state.error)
  const init = useAppStore((state) => state.init)
  const views = useAppStore((state) => state.views)
  const tasks = useAppStore((state) => state.tasks)
  const projects = useAppStore((state) => state.projects)
  const tags = useAppStore((state) => state.tags)
  const taskTags = useAppStore((state) => state.taskTags)
  const settings = useAppStore((state) => state.settings)
  const activeTab = useAppStore((state) => state.activeTab)
  const activeViewId = useAppStore((state) => state.activeViewId)
  const search = useAppStore((state) => state.search)
  const tagFilterId = useAppStore((state) => state.tagFilterId)
  const projectFilterId = useAppStore((state) => state.projectFilterId)
  const selectedTaskId = useAppStore((state) => state.selectedTaskId)
  const setActiveView = useAppStore((state) => state.setActiveView)
  const selectTask = useAppStore((state) => state.selectTask)
  const setTaskStatus = useAppStore((state) => state.setTaskStatus)
  const softDeleteTask = useAppStore((state) => state.softDeleteTask)
  const restoreTask = useAppStore((state) => state.restoreTask)
  const emptyTrash = useAppStore((state) => state.emptyTrash)

  const [previewPanels, setPreviewPanels] = useState(false)
  const [dialog, setDialog] = useState<DialogState>(null)
  const now = useNow()
  const theme = useResolvedTheme(settings.theme)
  const debouncedSearch = useDebounced(search)
  const context = useFilterContext(now)
  const palette = paletteFor(theme)

  useEffect(() => {
    void init()
  }, [init])

  const orderedViews = useMemo(
    () => views.filter((view) => view.deletedAt === null).sort((a, b) => a.sortOrder - b.sortOrder),
    [views],
  )

  const inboxView = useMemo(
    () => orderedViews.find((view) => view.preset === 'inbox') ?? null,
    [orderedViews],
  )

  const activeView = useMemo(() => {
    const found = views.find((view) => view.id === activeViewId)
    if (found !== undefined) return found
    return orderedViews[0] ?? null
  }, [views, activeViewId, orderedViews])

  const filtered = useMemo(() => {
    if (activeView === null) return []
    let list = selectTasks(tasks, activeView, context)
    const needle = debouncedSearch.trim().toLowerCase()
    if (needle !== '') {
      list = list.filter(
        (task) =>
          task.title.toLowerCase().includes(needle) || task.notes.toLowerCase().includes(needle),
      )
    }
    if (tagFilterId !== null) {
      list = list.filter((task) => (taskTags[task.id] ?? []).includes(tagFilterId))
    }
    if (projectFilterId !== null) {
      list = list.filter((task) => task.projectId === projectFilterId)
    }
    return sortTasks(list, activeView, context)
  }, [activeView, tasks, context, debouncedSearch, tagFilterId, projectFilterId, taskTags])

  const groups = useMemo(() => {
    if (activeView === null) return []
    const visibleProjects = projects.filter((project) => project.deletedAt === null)
    const visibleTags = tags.filter((tag) => tag.deletedAt === null)
    return groupTasks(filtered, activeView, context, visibleTags, visibleProjects, palette)
  }, [activeView, filtered, context, tags, projects, palette])

  const doneCount = filtered.filter((task) => task.status === 'done').length

  const lookup = useMemo<TaskLookup>(() => {
    const projectsById = new Map(projects.map((project) => [project.id, project]))
    const tagsById = new Map(tags.map((tag) => [tag.id, tag]))
    return {
      projectsById,
      tagsOfTask: (taskId) =>
        (taskTags[taskId] ?? [])
          .map((tagId) => tagsById.get(tagId))
          .filter((tag): tag is Tag => tag !== undefined),
      now,
      palette,
      selectedTaskId,
      onSelect: (task) => selectTask(task.id === selectedTaskId ? null : task.id),
      onCycleStatus: (task) => {
        void setTaskStatus(task.id, nextStatus(task.status))
      },
      onEdit: (task) => setDialog({ kind: 'task', task }),
      onDelete: (task) => setDialog({ kind: 'confirm-delete', task }),
      onRestore: (task) => {
        void restoreTask(task.id)
      },
    }
  }, [
    projects,
    tags,
    taskTags,
    now,
    palette,
    selectedTaskId,
    selectTask,
    setTaskStatus,
    restoreTask,
  ])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null
      const typing =
        target !== null &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        document.getElementById('pantodo-search')?.focus()
        return
      }
      if (typing) return
      // "n" captures into the inbox — the only place tasks are created.
      if (event.key === 'n' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault()
        setPreviewPanels(false)
        if (inboxView !== null) setActiveView(inboxView.id)
        window.setTimeout(() => document.getElementById('pantodo-inbox-input')?.focus(), 0)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [inboxView, setActiveView])

  const trashedCount = tasks.filter((task) => task.deletedAt !== null).length
  const searching = debouncedSearch.trim() !== ''
  const isInbox = activeView?.preset === 'inbox'
  const isTrash = activeView?.preset === 'trash'

  const emptyTitle = isTrash
    ? 'empty.trashTitle'
    : searching
      ? 'empty.searchTitle'
      : isInbox
        ? 'empty.inboxTitle'
        : activeView !== null && !activeView.builtin
          ? 'empty.customViewTitle'
          : 'empty.title'
  const emptyBody = isTrash
    ? 'empty.trashBody'
    : searching
      ? 'empty.searchBody'
      : isInbox
        ? 'empty.inboxBody'
        : activeView !== null && !activeView.builtin
          ? 'empty.customViewBody'
          : 'empty.body'

  return (
    <>
      <div className="scene" />
      <div id="app">
        <Sidebar
          now={now}
          theme={theme}
          previewActive={previewPanels}
          onOpenPreview={() => setPreviewPanels(true)}
          onLeavePreview={() => setPreviewPanels(false)}
          onNewProject={() => setDialog({ kind: 'entity', entityKind: 'project', entity: null })}
          onNewTag={() => setDialog({ kind: 'entity', entityKind: 'tag', entity: null })}
          onNewView={() => {
            setPreviewPanels(false)
            setDialog({ kind: 'view', view: null })
          }}
          onEditProject={(project) =>
            setDialog({ kind: 'entity', entityKind: 'project', entity: project })
          }
          onEditTag={(tag) => setDialog({ kind: 'entity', entityKind: 'tag', entity: tag })}
          onEditView={(view) => setDialog({ kind: 'view', view })}
          onOpenSettings={() => setDialog({ kind: 'settings' })}
        />

        <main className="main">
          <Toolbar
            previewPanels={previewPanels}
            tab={activeTab}
            view={activeView}
            total={filtered.length}
            doneCount={doneCount}
          />

          <div
            className={
              !previewPanels && isInbox && activeTab === 'views'
                ? 'reader reader-create'
                : !previewPanels && activeTab === 'timetable'
                  ? 'reader reader-flush'
                  : 'reader'
            }
          >
            {error !== null ? <p className="banner">{error}</p> : null}

            {!ready ? (
              <p className="banner">…</p>
            ) : previewPanels ? (
              <PanelPreview lookup={lookup} />
            ) : activeTab === 'timetable' ? (
              <Timetable now={now} theme={theme} />
            ) : isInbox ? (
              <InboxComposer />
            ) : activeView === null ? null : (
              <>
                <div className="page-intro list-intro">
                  <div>
                    <span className="little-label">{t('ui.atYourPace')}</span>
                    <h2>
                      {activeView.preset === 'today'
                        ? t('ui.todayTitle')
                        : activeView.preset === 'trash'
                          ? t('nav.trash')
                          : activeView.preset === 'all'
                            ? t('ui.allTitle')
                            : activeView.name}
                      <span className="heading-spark">✳</span>
                    </h2>
                    <p>{t('ui.listSubtitle')}</p>
                  </div>
                  <PaperFriend small />
                </div>
                <div className="list-overview">
                  <span>
                    <span className="status-dot" />
                    {
                      filtered.filter(
                        (task) => task.status !== 'done' && task.status !== 'cancelled',
                      ).length
                    }{' '}
                    {t('ui.openTasks')}
                  </span>
                  <span>
                    {doneCount} {t('ui.doneTasks')}
                  </span>
                  <span className="toolbar-spacer" />
                  <span className="sort-caption">
                    <Icon name="rows" size={14} />
                    {t('ui.order')}
                  </span>
                </div>

                {filtered.length === 0 && activeView.groups.length === 0 ? (
                  <EmptyState
                    icon={isTrash ? 'trash' : isInbox ? 'inbox' : 'calendarCheck'}
                    titleKey={emptyTitle}
                    bodyKey={emptyBody}
                    action={
                      isTrash || searching || isInbox || inboxView === null
                        ? undefined
                        : {
                            labelKey: 'empty.gotoInbox',
                            onSelect: () => setActiveView(inboxView.id),
                          }
                    }
                  />
                ) : (
                  <GroupBoard
                    groups={groups}
                    lookup={lookup}
                    view={activeView}
                    onReorderGroups={(from, to) => {
                      void useAppStore.getState().reorderGroups(activeView.id, from, to)
                    }}
                  />
                )}

                {isTrash && trashedCount > 0 ? (
                  <div className="row" style={{ marginTop: 'var(--space-5)' }}>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => setDialog({ kind: 'confirm-empty-trash' })}
                    >
                      <Icon name="trash" />
                      {t('dialog.emptyTrashTitle')}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </main>
      </div>

      {dialog?.kind === 'task' ? (
        <TaskDialog task={dialog.task} onClose={() => setDialog(null)} />
      ) : null}

      {dialog?.kind === 'entity' ? (
        <EntityDialog
          kind={dialog.entityKind}
          entity={dialog.entity}
          onClose={() => setDialog(null)}
        />
      ) : null}

      {dialog?.kind === 'view' ? (
        <ViewDialog view={dialog.view} onClose={() => setDialog(null)} />
      ) : null}

      {dialog?.kind === 'settings' ? <SettingsDialog onClose={() => setDialog(null)} /> : null}

      {dialog?.kind === 'confirm-delete' ? (
        <ConfirmDialog
          title={t('dialog.deleteTitle')}
          body={t('dialog.deleteBody', { name: dialog.task.title })}
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            void softDeleteTask(dialog.task.id)
            setDialog(null)
          }}
        />
      ) : null}

      {dialog?.kind === 'confirm-empty-trash' ? (
        <ConfirmDialog
          title={t('dialog.emptyTrashTitle')}
          body={t('dialog.emptyTrashBody', { count: trashedCount })}
          confirmKey="dialog.emptyTrashTitle"
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            void emptyTrash()
            setDialog(null)
          }}
        />
      ) : null}

      <Toast />
    </>
  )
}
