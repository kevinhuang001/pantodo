import { useState } from 'react'
import type { FormEvent } from 'react'

import { paletteFor } from '@/domain/palette'
import { useAppStore } from '@/domain/store'
import type { Project, Tag } from '@/domain/types'
import { t } from '@/i18n'

import { Modal } from './Modal'

interface EntityDialogProps {
  kind: 'project' | 'tag'
  entity: Project | Tag | null
  onClose: () => void
}

export function EntityDialog({ kind, entity, onClose }: EntityDialogProps) {
  const settings = useAppStore((state) => state.settings)
  const createProject = useAppStore((state) => state.createProject)
  const updateProject = useAppStore((state) => state.updateProject)
  const softDeleteProject = useAppStore((state) => state.softDeleteProject)
  const createTag = useAppStore((state) => state.createTag)
  const updateTag = useAppStore((state) => state.updateTag)
  const softDeleteTag = useAppStore((state) => state.softDeleteTag)

  const palette = paletteFor(settings.theme === 'dark' ? 'dark' : 'light')
  const [name, setName] = useState(entity?.name ?? '')
  const [color, setColor] = useState<string | null>(entity?.color ?? null)

  const isEdit = entity !== null
  const title = isEdit
    ? kind === 'project'
      ? t('dialog.editProject')
      : t('dialog.editTag')
    : kind === 'project'
      ? t('dialog.newProject')
      : t('dialog.newTag')

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()
    const trimmed = name.trim()
    if (trimmed === '') return
    if (kind === 'project') {
      if (entity === null) await createProject(trimmed, color)
      else await updateProject(entity.id, { name: trimmed, color })
    } else if (entity === null) {
      await createTag(trimmed, color)
    } else {
      await updateTag(entity.id, { name: trimmed, color })
    }
    onClose()
  }

  async function remove(): Promise<void> {
    if (entity === null) return
    if (kind === 'project') await softDeleteProject(entity.id)
    else await softDeleteTag(entity.id)
    onClose()
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          {isEdit ? (
            <button type="button" className="danger-button" onClick={() => void remove()}>
              {t('task.action.delete')}
            </button>
          ) : null}
          <button type="button" className="secondary" onClick={onClose}>
            {t('dialog.cancel')}
          </button>
          <button type="submit" form="pantodo-entity-form" className="primary">
            {isEdit ? t('dialog.save') : t('dialog.create')}
          </button>
        </>
      }
    >
      <form id="pantodo-entity-form" className="stack" onSubmit={(event) => void submit(event)}>
        <div className="field">
          <label htmlFor="entity-name">{t('task.field.name')}</label>
          <input
            id="entity-name"
            className="input"
            value={name}
            autoFocus
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="field">
          <label>{t('task.field.color')}</label>
          <div className="swatches">
            <button
              type="button"
              className={color === null ? 'swatch auto selected' : 'swatch auto'}
              aria-label={t('task.field.none')}
              onClick={() => setColor(null)}
            >
              A
            </button>
            {palette.map((value) => (
              <button
                key={value}
                type="button"
                className={color === value ? 'swatch selected' : 'swatch'}
                style={{ background: value }}
                aria-label={value}
                onClick={() => setColor(value)}
              />
            ))}
          </div>
        </div>
      </form>
    </Modal>
  )
}
