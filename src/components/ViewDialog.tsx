import { useState } from 'react'
import { useAppStore } from '@/domain/store'
import { type View } from '@/domain/types'
import { t } from '@/i18n'
import { Modal } from './Modal'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { EmojiPicker } from './EmojiPicker'
import { SelectField } from './SelectField'
export function ViewDialog({ view, onClose }: { view: View | null; onClose: () => void }) {
  const [name, setName] = useState(view?.name ?? ''),
    [emoji, setEmoji] = useState(view?.emoji ?? '🧩')
  const [columnCount, setColumnCount] = useState(view?.columnCount ?? 2)
  const [saving, setSaving] = useState(false),
    [error, setError] = useState('')
  async function submit() {
    if (saving || !name.trim()) return
    setSaving(true)
    setError('')
    try {
      if (view)
        await useAppStore.getState().updateView(view.id, { name: name.trim(), emoji, columnCount })
      else await useAppStore.getState().createView({ name: name.trim(), emoji })
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
              variant="destructive"
              className="danger-button"
              onClick={() => {
                void useAppStore
                  .getState()
                  .softDeleteView(view.id)
                  .then(onClose)
                  .catch(() => setError(t('work.failed')))
              }}
            >
              {t('task.action.delete')}
            </Button>
          ) : null}
          <Button variant="outline" className="secondary" onClick={onClose}>
            {t('dialog.cancel')}
          </Button>
          <Button
            className="primary"
            disabled={saving || !name.trim()}
            type="submit"
            form="pantodo-view-form"
          >
            {view ? t('dialog.save') : t('dialog.create')}
          </Button>
        </>
      }
    >
      <form
        id="pantodo-view-form"
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <div className="field">
          <label htmlFor="view-name">{t('task.field.name')}</label>
          <Input
            id="view-name"
            className="input"
            autoFocus
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <EmojiPicker value={emoji} onChange={setEmoji} />
        {view ? (
          <div className="view-layout-settings">
            <div>
              <label htmlFor="view-column-count">{t('view.field.columns')}</label>
              <p>{t('view.columnsHint')}</p>
            </div>
            <SelectField
              id="view-column-count"
              value={columnCount}
              onValueChange={(value) => setColumnCount(Number(value))}
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </SelectField>
          </div>
        ) : null}
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  )
}
