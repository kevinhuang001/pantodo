import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useAppStore } from '@/domain/store'
import { matchesFilter, sortTasks } from '@/domain/filters'
import type { FilterContext } from '@/domain/filters'
import { newPanel } from '@/domain/views'
import type { Task, View, ViewPanel, ViewSort } from '@/domain/types'
import { t } from '@/i18n'
import { FilterFields } from './FilterFields'
import { EmojiPicker } from './EmojiPicker'
import { Modal } from './Modal'
import { Icon } from './Icon'
import { TaskList } from './TaskList'
import type { TaskLookup } from './TaskList'

export function PanelBoard({
  view,
  tasks,
  context,
  lookup,
}: {
  view: View
  tasks: Task[]
  context: FilterContext
  lookup: TaskLookup
}) {
  const updateView = useAppStore((s) => s.updateView)
  const [editing, setEditing] = useState<ViewPanel | null>(null),
    [dragged, setDragged] = useState<number | null>(null),
    [error, setError] = useState(false)
  const panels = view.panels ?? []
  const columns = view.arrangement === 'vertical' ? 1 : Math.max(1, view.gridColumns)
  const save = (next: ViewPanel[]) => {
    setError(false)
    void updateView(view.id, { panels: next }).catch(() => setError(true))
  }
  const move = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= panels.length || to >= panels.length) return
    const next = [...panels]
    const item = next.splice(from, 1)[0]!
    next.splice(to, 0, item)
    save(next)
  }
  return (
    <>
      <div className="panel-board-toolbar">
        <p className="field-hint">{t('panel.hint')}</p>
        <button className="secondary" onClick={() => setEditing(newPanel())}>
          <Icon name="plus" size={14} />
          {t('panel.add')}
        </button>
      </div>
      {error ? (
        <p className="form-error" role="alert">
          {t('work.failed')}
        </p>
      ) : null}
      <div className="composed-panels" style={{ '--panel-columns': columns } as CSSProperties}>
        {panels.map((panel, index) => {
          const list = sortTasks(
            tasks.filter((task) => matchesFilter(task, panel.filter, context)),
            { ...view, sort: panel.sort },
            context,
          )
          return (
            <section
              key={panel.id}
              data-panel-id={panel.id}
              className={
                'preview-panel composed-panel' + (dragged === index ? ' panel-dragging' : '')
              }
              style={{ '--panel-span': Math.min(panel.span, columns) } as CSSProperties}
              onDragOver={(event) => {
                if (dragged !== null) event.preventDefault()
              }}
              onDrop={(event) => {
                event.preventDefault()
                if (dragged !== null) move(dragged, index)
                setDragged(null)
              }}
            >
              <header>
                <span
                  className="panel-move"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/plain', panel.id)
                    setDragged(index)
                  }}
                  onDragEnd={() => setDragged(null)}
                  title={t('panel.drag')}
                >
                  <Icon name="grip" size={14} />
                </span>
                <span className="panel-emoji" aria-hidden="true">
                  {panel.emoji}
                </span>
                <h3>{panel.name}</h3>
                <span className="panel-count">{list.length}</span>
                <button
                  className="icon-button"
                  aria-label={t('panel.edit')}
                  onClick={() => setEditing(panel)}
                >
                  <Icon name="pencil" size={13} />
                </button>
              </header>
              <div className="panel-meta">
                <span>
                  <Icon name="sliders" size={11} />
                  {panel.filter.tagIds.length
                    ? panel.filter.tagIds.length + ' ' + t('task.field.tags')
                    : t('panel.all')}
                  {panel.filter.statuses.length
                    ? ' · ' +
                      panel.filter.statuses
                        .map((s) => t(('task.status.' + s) as 'task.status.todo'))
                        .join(' / ')
                    : ''}
                </span>
                <div className="panel-reorder">
                  <button
                    type="button"
                    className="icon-button"
                    disabled={index === 0}
                    aria-label={t('panel.moveBefore')}
                    onClick={() => move(index, index - 1)}
                  >
                    <Icon name="chevronLeft" size={12} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    disabled={index === panels.length - 1}
                    aria-label={t('panel.moveAfter')}
                    onClick={() => move(index, index + 1)}
                  >
                    <Icon name="chevronRight" size={12} />
                  </button>
                  <select
                    className="compact-select"
                    aria-label={t('panel.width')}
                    value={Math.min(panel.span, columns)}
                    onChange={(e) =>
                      save(
                        panels.map((p) =>
                          p.id === panel.id ? { ...p, span: Number(e.target.value) } : p,
                        ),
                      )
                    }
                  >
                    {Array.from({ length: columns }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1} / {columns}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <TaskList tasks={list} lookup={lookup} emptyKey="group.empty" />
            </section>
          )
        })}
      </div>
      {!panels.length ? <p className="stats-empty">{t('panel.empty')}</p> : null}
      {editing ? (
        <PanelDialog
          key={editing.id}
          panel={editing}
          onClose={() => setEditing(null)}
          onSave={(panel) => {
            const current = useAppStore.getState().views.find((v) => v.id === view.id)?.panels ?? []
            save(
              current.some((p) => p.id === panel.id)
                ? current.map((p) => (p.id === panel.id ? panel : p))
                : [...current, panel],
            )
            setEditing(null)
          }}
          onDelete={() => {
            save(panels.filter((p) => p.id !== editing.id))
            setEditing(null)
          }}
        />
      ) : null}
    </>
  )
}
function PanelDialog({
  panel,
  onClose,
  onSave,
  onDelete,
}: {
  panel: ViewPanel
  onClose: () => void
  onSave: (panel: ViewPanel) => void
  onDelete: () => void
}) {
  const [value, setValue] = useState(panel)
  return (
    <Modal
      title={t('panel.edit')}
      onClose={onClose}
      footer={
        <>
          <button className="danger-button" onClick={onDelete}>
            {t('task.action.delete')}
          </button>
          <button className="secondary" onClick={onClose}>
            {t('dialog.cancel')}
          </button>
          <button className="primary" type="submit" form="panel-form">
            {t('dialog.save')}
          </button>
        </>
      }
    >
      <form
        id="panel-form"
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          if (value.name.trim()) onSave({ ...value, name: value.name.trim() })
        }}
      >
        <div className="field">
          <label htmlFor="panel-name">{t('task.field.name')}</label>
          <input
            id="panel-name"
            className="input"
            required
            value={value.name}
            onChange={(e) => setValue({ ...value, name: e.target.value })}
          />
        </div>
        <EmojiPicker value={value.emoji} onChange={(emoji) => setValue({ ...value, emoji })} />
        <div className="field">
          <label htmlFor="panel-sort">{t('panel.sort')}</label>
          <select
            className="select"
            id="panel-sort"
            value={value.sort}
            onChange={(e) => setValue({ ...value, sort: e.target.value as ViewSort })}
          >
            {(['manual', 'due', 'created', 'title'] as const).map((key) => (
              <option key={key} value={key}>
                {t(('panel.sort.' + key) as 'panel.sort.manual')}
              </option>
            ))}
          </select>
        </div>
        <FilterFields
          prefix="panel-filter"
          value={value.filter}
          onChange={(filter) => setValue({ ...value, filter })}
        />
      </form>
    </Modal>
  )
}
