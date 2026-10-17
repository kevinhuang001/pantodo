import { Button } from './ui/button'
import { Input } from './ui/input'
import { SelectField } from './SelectField'
import { useState } from 'react'
import { useAppStore } from '@/domain/store'
import { ARRANGEMENT_LABEL_KEYS, GROUP_BY_LABEL_KEYS } from '@/domain/display'
import { quadrantPanels } from '@/domain/views'
import { EMPTY_FILTER } from '@/domain/types'
import type { GroupArrangement, GroupField, View } from '@/domain/types'
import { t } from '@/i18n'
import { Modal } from './Modal'
import { EmojiPicker } from './EmojiPicker'
import { FilterFields } from './FilterFields'

export function ViewDialog({ view, onClose }: { view: View | null; onClose: () => void }) {
  const tags = useAppStore((s) => s.tags).filter((tag) => !tag.deletedAt)
  const [name, setName] = useState(view?.name ?? ''),
    [emoji, setEmoji] = useState(view?.emoji ?? '🧩')
  const [mode, setMode] = useState(view?.panels ? 'panels' : view ? 'groups' : 'panels'),
    [template, setTemplate] = useState('blank')
  const [groupBy, setGroupBy] = useState<GroupField>(view?.groupBy ?? 'none'),
    [arrangement, setArrangement] = useState<GroupArrangement>(view?.arrangement ?? 'grid'),
    [gridColumns, setGridColumns] = useState(view?.gridColumns ?? 2)
  const [filter, setFilter] = useState(view?.filter ?? { ...EMPTY_FILTER }),
    [important, setImportant] = useState(tags[0]?.id ?? ''),
    [urgent, setUrgent] = useState(tags[1]?.id ?? ''),
    [error, setError] = useState(''),
    [saving, setSaving] = useState(false)
  async function submit() {
    setError('')
    setSaving(true)
    try {
      if (!name.trim()) return
      if (
        mode === 'panels' &&
        template === 'quadrant' &&
        (!important || !urgent || important === urgent)
      ) {
        setError(t('panel.invalidTags'))
        return
      }
      const panels =
        mode === 'panels'
          ? template === 'quadrant'
            ? quadrantPanels(important, urgent)
            : (view?.panels ?? [])
          : undefined
      const payload = {
        name: name.trim(),
        emoji,
        icon: view?.icon ?? 'layers',
        panels,
        groupBy: mode === 'panels' ? ('none' as const) : groupBy,
        arrangement,
        gridColumns,
        filter,
      }
      if (view)
        await useAppStore
          .getState()
          .updateView(view.id, { ...payload, groups: mode === 'panels' ? [] : view.groups })
      else await useAppStore.getState().createView(payload)
      onClose()
    } catch {
      setError(t('work.failed'))
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal
      title={view ? t('dialog.editView') : t('dialog.newView')}
      onClose={onClose}
      footer={
        <>
          {view ? (
            <Button
              className="danger-button"
              variant="destructive"
              onClick={() => {
                void useAppStore.getState().softDeleteView(view.id)
                onClose()
              }}
            >
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
            form="pantodo-view-form"
            disabled={saving || !name.trim()}
          >
            {view ? t('dialog.save') : t('dialog.create')}
          </Button>
        </>
      }
    >
      <form
        id="pantodo-view-form"
        className="stack"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <div className="field">
          <label htmlFor="view-name">{t('task.field.name')}</label>
          <Input
            id="view-name"
            className="input"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <EmojiPicker value={emoji} onChange={setEmoji} />
        {view ? (
          <>
            <div className="form-row">
              <div className="field">
                <label htmlFor="view-mode">{t('panel.mode')}</label>
                <SelectField
                  id="view-mode"
                  className="select"
                  value={mode}
                  onValueChange={(e) => setMode(e)}
                >
                  <option value="panels">{t('panel.compose')}</option>
                  <option value="groups">{t('panel.simple')}</option>
                </SelectField>
              </div>
              <div className="field">
                <label htmlFor="view-template">{t('panel.template')}</label>
                <SelectField
                  id="view-template"
                  className="select"
                  value={template}
                  onValueChange={(e) => {
                    setTemplate(e)
                    if (e === 'tags') {
                      setMode('groups')
                      setGroupBy('tag')
                    } else setMode('panels')
                  }}
                >
                  <option value="blank">{t('panel.template.blank')}</option>
                  <option value="tags">{t('panel.template.tags')}</option>
                  <option value="quadrant">{t('panel.template.quadrant')}</option>
                </SelectField>
              </div>
            </div>
            {mode === 'panels' && template === 'quadrant' ? (
              <div className="form-row">
                <div className="field">
                  <label htmlFor="view-important">{t('panel.important')}</label>
                  <SelectField
                    id="view-important"
                    className="select"
                    value={important}
                    onValueChange={(e) => setImportant(e)}
                  >
                    <option value="">—</option>
                    {tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div className="field">
                  <label htmlFor="view-urgent">{t('panel.urgent')}</label>
                  <SelectField
                    id="view-urgent"
                    className="select"
                    value={urgent}
                    onValueChange={(e) => setUrgent(e)}
                  >
                    <option value="">—</option>
                    {tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </SelectField>
                </div>
              </div>
            ) : null}
            <div className="form-row">
              {mode === 'groups' ? (
                <div className="field">
                  <label htmlFor="view-group">{t('view.field.groupBy')}</label>
                  <SelectField
                    id="view-group"
                    className="select"
                    value={groupBy}
                    onValueChange={(e) => setGroupBy(e as GroupField)}
                  >
                    {(['none', 'tag', 'project', 'status'] as const).map((key) => (
                      <option key={key} value={key}>
                        {t(GROUP_BY_LABEL_KEYS[key])}
                      </option>
                    ))}
                  </SelectField>
                </div>
              ) : null}
              <div className="field">
                <label htmlFor="view-arrangement">{t('toolbar.arrangement')}</label>
                <SelectField
                  id="view-arrangement"
                  className="select"
                  value={arrangement}
                  onValueChange={(e) => setArrangement(e as GroupArrangement)}
                >
                  {(['vertical', 'columns', 'grid'] as const).map((key) => (
                    <option key={key} value={key}>
                      {t(ARRANGEMENT_LABEL_KEYS[key])}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div className="field">
                <label htmlFor="view-columns">{t('view.field.columns')}</label>
                <Input
                  id="view-columns"
                  className="input"
                  type="number"
                  min={1}
                  max={4}
                  required
                  value={gridColumns}
                  onChange={(e) => setGridColumns(Math.min(4, Math.max(1, Number(e.target.value))))}
                />
              </div>
            </div>
            <details className="view-filter-details">
              <summary>
                {t('view.field.filterTags')} · {t('panel.text')}
              </summary>
              <FilterFields prefix="view-filter" value={filter} onChange={setFilter} />
            </details>
          </>
        ) : (
          <p className="field-hint">{t('view.createHint')}</p>
        )}
        {error ? (
          <p role="alert" className="form-error">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  )
}
