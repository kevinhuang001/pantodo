import { useState } from 'react'
import type { FormEvent } from 'react'

import {
  ARRANGEMENT_LABEL_KEYS,
  GROUP_BY_LABEL_KEYS,
  LAYOUT_LABEL_KEYS,
  STATUS_LABEL_KEYS,
} from '@/domain/display'
import { paletteFor } from '@/domain/palette'
import { useAppStore } from '@/domain/store'
import type { GroupArrangement, GroupField, TaskStatus, View, ViewLayout } from '@/domain/types'
import { EMPTY_FILTER, TASK_STATUSES } from '@/domain/types'
import { t } from '@/i18n'

import { Icon } from './Icon'
import type { IconName } from './Icon'
import { Modal } from './Modal'

interface ViewDialogProps {
  view: View | null
  onClose: () => void
}

const GROUP_FIELDS: GroupField[] = ['none', 'tag', 'project', 'status']
const LAYOUTS: ViewLayout[] = ['list', 'board']
const ARRANGEMENTS: GroupArrangement[] = ['vertical', 'columns', 'grid']
const ICONS: IconName[] = ['list', 'grid', 'layers', 'sliders', 'tag', 'calendar', 'sun', 'inbox']

/** Creates and edits custom views: filter + grouping + arrangement + layout. */
export function ViewDialog({ view, onClose }: ViewDialogProps) {
  const tags = useAppStore((state) => state.tags).filter((tag) => tag.deletedAt === null)
  const projects = useAppStore((state) => state.projects).filter(
    (project) => project.deletedAt === null,
  )
  const settings = useAppStore((state) => state.settings)
  const createView = useAppStore((state) => state.createView)
  const updateView = useAppStore((state) => state.updateView)
  const softDeleteView = useAppStore((state) => state.softDeleteView)

  const [name, setName] = useState(view?.name ?? '')
  const [icon, setIcon] = useState<string>(view?.icon ?? 'layers')
  const [layout, setLayout] = useState<ViewLayout>(view?.layout ?? 'list')
  const [groupBy, setGroupBy] = useState<GroupField>(view?.groupBy ?? 'none')
  const [arrangement, setArrangement] = useState<GroupArrangement>(view?.arrangement ?? 'vertical')
  const [gridColumns, setGridColumns] = useState(view?.gridColumns ?? 2)
  const [tagIds, setTagIds] = useState<string[]>(view?.filter.tagIds ?? [])
  const [tagMode, setTagMode] = useState<'any' | 'all'>(view?.filter.tagMode ?? 'any')
  const [projectId, setProjectId] = useState<string>(view?.filter.projectIds[0] ?? '')
  const [statuses, setStatuses] = useState<TaskStatus[]>(view?.filter.statuses ?? [])

  const palette = paletteFor(settings.theme === 'dark' ? 'dark' : 'light')
  const isEdit = view !== null

  function toggleTag(id: string): void {
    setTagIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    )
  }

  function toggleStatus(status: TaskStatus): void {
    setStatuses((current) =>
      current.includes(status) ? current.filter((value) => value !== status) : [...current, status],
    )
  }

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()
    const trimmed = name.trim()
    if (trimmed === '') return
    const payload = {
      name: trimmed,
      icon,
      layout,
      groupBy,
      arrangement,
      gridColumns,
      filter: {
        ...EMPTY_FILTER,
        tagIds,
        tagMode,
        projectIds: projectId === '' ? [] : [projectId],
        statuses,
      },
    }
    if (view === null) {
      await createView(payload)
    } else {
      await updateView(view.id, payload)
    }
    onClose()
  }

  return (
    <Modal
      title={isEdit ? t('dialog.editView') : t('dialog.newView')}
      onClose={onClose}
      footer={
        <>
          {isEdit ? (
            <button
              type="button"
              className="danger-button"
              onClick={() => {
                void softDeleteView(view.id)
                onClose()
              }}
            >
              {t('task.action.delete')}
            </button>
          ) : null}
          <button type="button" className="secondary" onClick={onClose}>
            {t('dialog.cancel')}
          </button>
          <button type="submit" form="pantodo-view-form" className="primary">
            {isEdit ? t('dialog.save') : t('dialog.create')}
          </button>
        </>
      }
    >
      <form id="pantodo-view-form" className="stack" onSubmit={(event) => void submit(event)}>
        <div className="field">
          <label htmlFor="view-name">{t('task.field.name')}</label>
          <input
            id="view-name"
            className="input"
            value={name}
            autoFocus
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="field">
          <label>{t('view.field.icon')}</label>
          <div className="swatches">
            {ICONS.map((candidate) => (
              <button
                key={candidate}
                type="button"
                className={icon === candidate ? 'icon-choice selected' : 'icon-choice'}
                aria-label={candidate}
                aria-pressed={icon === candidate}
                onClick={() => setIcon(candidate)}
              >
                <Icon name={candidate} size={15} />
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label htmlFor="view-layout">{t('view.field.layout')}</label>
            <select
              id="view-layout"
              className="select"
              value={layout}
              onChange={(event) => setLayout(event.target.value as ViewLayout)}
            >
              {LAYOUTS.map((value) => (
                <option key={value} value={value}>
                  {t(LAYOUT_LABEL_KEYS[value])}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="view-group">{t('view.field.groupBy')}</label>
            <select
              id="view-group"
              className="select"
              value={groupBy}
              onChange={(event) => setGroupBy(event.target.value as GroupField)}
            >
              {GROUP_FIELDS.map((value) => (
                <option key={value} value={value}>
                  {t(GROUP_BY_LABEL_KEYS[value])}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label htmlFor="view-arrangement">{t('toolbar.arrangement')}</label>
            <select
              id="view-arrangement"
              className="select"
              value={arrangement}
              onChange={(event) => setArrangement(event.target.value as GroupArrangement)}
            >
              {ARRANGEMENTS.map((value) => (
                <option key={value} value={value}>
                  {t(ARRANGEMENT_LABEL_KEYS[value])}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="view-columns">{t('view.field.columns')}</label>
            <input
              id="view-columns"
              type="number"
              min={1}
              max={4}
              className="input"
              value={gridColumns}
              disabled={arrangement !== 'grid'}
              onChange={(event) => setGridColumns(Number(event.target.value))}
            />
          </div>
        </div>

        <div className="field">
          <label>{t('view.field.filterTags')}</label>
          <div className="chip-row">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className={tagIds.includes(tag.id) ? 'chip selectable selected' : 'chip selectable'}
                aria-pressed={tagIds.includes(tag.id)}
                onClick={() => toggleTag(tag.id)}
              >
                <span
                  className="dot"
                  style={{ background: tag.color ?? palette[tag.sortOrder % palette.length] }}
                />
                {tag.name}
              </button>
            ))}
            {tagIds.length > 1 ? (
              <button
                type="button"
                className="chip selectable"
                onClick={() => setTagMode(tagMode === 'any' ? 'all' : 'any')}
              >
                {tagMode === 'any' ? t('view.tags.any') : t('view.tags.all')}
              </button>
            ) : null}
          </div>
        </div>

        <div className="field">
          <label>{t('view.field.filterStatus')}</label>
          <div className="chip-row">
            {TASK_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                className={
                  statuses.includes(status) ? 'chip selectable selected' : 'chip selectable'
                }
                aria-pressed={statuses.includes(status)}
                onClick={() => toggleStatus(status)}
              >
                {t(STATUS_LABEL_KEYS[status])}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="view-project">{t('view.field.filterProject')}</label>
          <select
            id="view-project"
            className="select"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
          >
            <option value="">{t('task.field.none')}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </form>
    </Modal>
  )
}
