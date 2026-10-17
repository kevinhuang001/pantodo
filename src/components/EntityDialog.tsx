import { Button } from './ui/button'
import { Input } from './ui/input'
import { useState } from 'react'
import type { FormEvent } from 'react'

import { paletteFor } from '@/domain/palette'
import { useAppStore } from '@/domain/store'
import type { Project, Tag } from '@/domain/types'
import { t } from '@/i18n'

import { EmojiPicker } from './EmojiPicker'
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
  const [emoji, setEmoji] = useState(entity && 'emoji' in entity ? (entity.emoji ?? '📁') : '📁')
  const [name, setName] = useState(entity?.name ?? '')
  const [color, setColor] = useState<string | null>(
    entity && 'color' in entity ? entity.color : null,
  )

  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)
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
    if (trimmed === '' || saving) return
    setSaving(true)
    setError(false)
    try {
      if (kind === 'project') {
        if (entity === null) await createProject(trimmed, emoji)
        else await updateProject(entity.id, { name: trimmed, emoji })
      } else if (entity === null) {
        await createTag(trimmed, color)
      } else {
        await updateTag(entity.id, { name: trimmed, color })
      }
      onClose()
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
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
            <Button
              type="button"
              className="danger-button"
              variant="destructive"
              onClick={() => void remove()}
            >
              {t('task.action.delete')}
            </Button>
          ) : null}
          <Button type="button" className="secondary" variant="outline" onClick={onClose}>
            {t('dialog.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={saving || !name.trim()}
            form="pantodo-entity-form"
            className="primary"
            variant="default"
          >
            {isEdit ? t('dialog.save') : t('dialog.create')}
          </Button>
        </>
      }
    >
      <form id="pantodo-entity-form" className="stack" onSubmit={(event) => void submit(event)}>
        <div className="field">
          <label htmlFor="entity-name">{t('task.field.name')}</label>
          <Input
            id="entity-name"
            className="input"
            required
            value={name}
            autoFocus
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        {kind === 'project' ? <EmojiPicker value={emoji} onChange={setEmoji} /> : null}
        {kind === 'tag' ? (
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
        ) : null}
        {error ? (
          <p className="form-error" role="alert">
            {t('work.failed')}
          </p>
        ) : null}
      </form>
    </Modal>
  )
}
