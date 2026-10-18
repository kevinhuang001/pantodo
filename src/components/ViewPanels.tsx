import { useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAppStore } from '@/domain/store'
import { matchesFilter, sortTasks, type FilterContext } from '@/domain/filters'
import { newPanel } from '@/domain/views'
import type { Task, View, ViewPanel, ViewSort } from '@/domain/types'
import { t } from '@/i18n'
import { Button } from './ui/button'
import { SelectField } from './SelectField'
import { Input } from './ui/input'
import { FilterFields } from './FilterFields'
import { EmojiPicker } from './EmojiPicker'
import { Modal } from './Modal'
import { Icon } from './Icon'
import { PresentationPicker } from './PresentationPicker'
import { TaskList, type TaskLookup } from './TaskList'

function SortablePanel({
  panel,
  columns,
  children,
}: {
  panel: ViewPanel
  columns: number
  children: (handle: ReactNode) => ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: panel.id })
  const style = {
    '--panel-span': Math.min(panel.span, columns),
    transform: isDragging ? undefined : CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 2 : undefined,
  } as CSSProperties
  return (
    <section
      ref={setNodeRef}
      style={style}
      data-panel-id={panel.id}
      data-dragging={isDragging}
      className="composed-panel"
    >
      {children(
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="panel-move"
          {...attributes}
          {...listeners}
          aria-label={t('panel.drag') + ' · ' + panel.name}
          title={t('panel.dragHint')}
        >
          <Icon name="grip" size={16} />
        </button>,
      )}
    </section>
  )
}
export function ViewPanels({
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
  const [dragged, setDragged] = useState<{ id: string; width: number; height: number } | null>(null)
  const panelMaxHeight = useAppStore((s) => s.settings.panelMaxHeight ?? 480)
  const updateView = useAppStore((s) => s.updateView)
  const [editing, setEditing] = useState<ViewPanel | null>(null),
    [error, setError] = useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const panels = view.panels ?? [],
    columns = view.arrangement === 'vertical' ? 1 : Math.max(1, view.columnCount)
  const patch = (value: Partial<View>) => {
    setError(false)
    void updateView(view.id, value).catch(() => setError(true))
  }
  const move = (from: number, to: number) => {
    if (from !== to && from >= 0 && to >= 0 && from < panels.length && to < panels.length)
      patch({ panels: arrayMove(panels, from, to) })
  }
  const renderContent = (panel: ViewPanel, handle: ReactNode) => {
    const list = sortTasks(
      tasks.filter((task) => matchesFilter(task, panel.filter, context)),
      { ...view, sort: panel.sort },
      context,
    )
    return (
      <>
        <header>
          {handle}
          <span className="panel-emoji" aria-hidden="true">
            {panel.emoji}
          </span>
          <h3>{panel.name}</h3>
          <span className="panel-count">{list.length}</span>
          <PresentationPicker
            value={panel.presentation ?? 'list'}
            onChange={(presentation) =>
              patch({
                panels: panels.map((p) => (p.id === panel.id ? { ...p, presentation } : p)),
              })
            }
          />
          <button
            className="icon-button"
            aria-label={t('panel.edit')}
            onClick={() => setEditing(panel)}
          >
            <Icon name="pencil" size={13} />
          </button>
        </header>
        <div
          className="panel-tasks"
          style={{ '--panel-task-height': panelMaxHeight + 'px' } as CSSProperties}
          role="region"
          aria-label={panel.name}
          tabIndex={0}
        >
          <TaskList
            compact
            tasks={list}
            lookup={lookup}
            presentation={panel.presentation ?? 'list'}
            emptyKey="group.empty"
          />
        </div>
      </>
    )
  }
  return (
    <>
      <div className="panel-toolbar">
        <Button className="secondary" variant="outline" onClick={() => setEditing(newPanel())}>
          <Icon name="plus" size={14} />
          {t('panel.add')}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="form-error">
          {t('work.failed')}
        </p>
      ) : null}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        accessibility={{ screenReaderInstructions: { draggable: t('panel.dragHint') } }}
        onDragStart={({ active }) => {
          const rect = document
            .querySelector<HTMLElement>(
              `[data-panel-id="${globalThis.CSS.escape(String(active.id))}"]`,
            )
            ?.getBoundingClientRect()
          if (rect) setDragged({ id: String(active.id), width: rect.width, height: rect.height })
        }}
        onDragCancel={() => setDragged(null)}
        onDragEnd={({ active, over }) => {
          setDragged(null)
          if (over)
            move(
              panels.findIndex((p) => p.id === active.id),
              panels.findIndex((p) => p.id === over.id),
            )
        }}
      >
        <SortableContext items={panels.map((panel) => panel.id)} strategy={rectSortingStrategy}>
          <div className="composed-panels" style={{ '--panel-columns': columns } as CSSProperties}>
            {panels.map((panel) => (
              <SortablePanel key={panel.id} panel={panel} columns={columns}>
                {(handle) => renderContent(panel, handle)}
              </SortablePanel>
            ))}
          </div>
        </SortableContext>
        {createPortal(
          <DragOverlay adjustScale={false} dropAnimation={null}>
            {dragged && panels.find((p) => p.id === dragged.id) ? (
              <section
                inert
                aria-hidden="true"
                className="composed-panel panel-drag-overlay"
                style={{ width: dragged.width, height: dragged.height }}
              >
                {renderContent(
                  panels.find((p) => p.id === dragged.id)!,
                  <span className="panel-move">
                    <Icon name="grip" size={16} />
                  </span>,
                )}
              </section>
            ) : null}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>
      {!panels.length ? <p className="stats-empty">{t('panel.empty')}</p> : null}
      {editing ? (
        <PanelDialog
          key={editing.id}
          panel={editing}
          columns={columns}
          isNew={!panels.some((p) => p.id === editing.id)}
          onClose={() => setEditing(null)}
          onSave={async (panel) => {
            const current = useAppStore.getState().views.find((v) => v.id === view.id)?.panels ?? []
            await updateView(view.id, {
              panels: current.some((p) => p.id === panel.id)
                ? current.map((p) => (p.id === panel.id ? panel : p))
                : [...current, panel],
            })
            setEditing(null)
          }}
          onDelete={() => {
            patch({ panels: panels.filter((p) => p.id !== editing.id) })
            setEditing(null)
          }}
        />
      ) : null}
    </>
  )
}
function PanelDialog({
  panel,
  columns,
  onClose,
  onSave,
  onDelete,
  isNew,
}: {
  panel: ViewPanel
  columns: number
  onClose: () => void
  onSave: (panel: ViewPanel) => Promise<void>
  onDelete: () => void
  isNew: boolean
}) {
  const [value, setValue] = useState<ViewPanel>(() => ({
    ...panel,
    filter: {
      tagIds: panel.filter.tagIds,
      tagMode: panel.filter.tagMode,
      statuses: panel.filter.statuses,
      projectIds: panel.filter.projectIds,
      projectMode: panel.filter.projectMode,
      text: panel.filter.text,
    },
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  return (
    <Modal
      className="panel-editor modern-editor"
      title={t(isNew ? 'panel.add' : 'panel.edit')}
      onClose={onClose}
      footer={
        <>
          {!isNew ? (
            <Button className="danger-button" variant="destructive" onClick={onDelete}>
              {t('task.action.delete')}
            </Button>
          ) : null}
          <Button className="secondary" variant="outline" onClick={onClose}>
            {t('dialog.cancel')}
          </Button>
          <Button
            className="primary"
            variant="default"
            type="submit"
            form="panel-form"
            disabled={saving || !value.name.trim()}
          >
            {t('dialog.save')}
          </Button>
        </>
      }
    >
      <form
        id="panel-form"
        className="stack panel-editor-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (!value.name.trim() || saving) return
          setSaving(true)
          setError(false)
          void onSave({ ...value, name: value.name.trim() })
            .catch(() => setError(true))
            .finally(() => setSaving(false))
        }}
      >
        <div className="panel-identity">
          <EmojiPicker value={value.emoji} onChange={(emoji) => setValue({ ...value, emoji })} />
          <div className="field editor-title-field">
            <label htmlFor="panel-name">{t('task.field.name')}</label>
            <Input
              autoFocus
              id="panel-name"
              className="input"
              required
              value={value.name}
              onChange={(e) => setValue({ ...value, name: e.target.value })}
            />
          </div>
        </div>
        <fieldset className="editor-section">
          <legend>{t('panel.cards')}</legend>
          <PresentationPicker
            value={value.presentation ?? 'list'}
            onChange={(presentation) => setValue({ ...value, presentation })}
          />
          <div className="form-row">
            <div className="field">
              <label htmlFor="panel-sort">{t('panel.sort')}</label>
              <SelectField
                className="select"
                id="panel-sort"
                value={value.sort}
                onValueChange={(e) => setValue({ ...value, sort: e as ViewSort })}
              >
                {(['manual', 'due', 'created', 'title'] as const).map((key) => (
                  <option key={key} value={key}>
                    {t(('panel.sort.' + key) as 'panel.sort.manual')}
                  </option>
                ))}
              </SelectField>
            </div>
            {columns > 1 ? (
              <div className="field">
                <label htmlFor="panel-span">{t('panel.width')}</label>
                <SelectField
                  id="panel-span"
                  value={Math.min(value.span, columns)}
                  onValueChange={(span) => setValue({ ...value, span: Number(span) })}
                >
                  {Array.from({ length: columns }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1} / {columns}
                    </option>
                  ))}
                </SelectField>
              </div>
            ) : null}
          </div>
        </fieldset>
        <fieldset className="editor-section panel-filter-section">
          <legend>{t('editor.filters')}</legend>
          <FilterFields
            prefix="panel-filter"
            value={value.filter}
            onChange={(filter) => setValue({ ...value, filter })}
          />
        </fieldset>
        {error ? (
          <p className="form-error" role="alert">
            {t('work.failed')}
          </p>
        ) : null}
      </form>
    </Modal>
  )
}
