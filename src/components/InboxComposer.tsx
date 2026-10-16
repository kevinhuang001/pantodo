import { useState } from 'react'
import type { FormEvent } from 'react'

import { useAppStore } from '@/domain/store'
import { t } from '@/i18n'

import { Icon } from './Icon'

/** Tasks are captured here and nowhere else — the inbox is the single entry point. */
export function InboxComposer() {
  const createTask = useAppStore((state) => state.createTask)
  const [title, setTitle] = useState('')

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()
    const trimmed = title.trim()
    if (trimmed === '') return
    await createTask({ title: trimmed })
    setTitle('')
  }

  return (
    <form className="inbox-composer" onSubmit={(event) => void submit(event)}>
      <span className="inbox-lead">
        <Icon name="plus" size={15} />
      </span>
      <input
        id="pantodo-inbox-input"
        className="inbox-input"
        value={title}
        autoComplete="off"
        placeholder={t('inbox.placeholder')}
        aria-label={t('inbox.placeholder')}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setTitle('')
        }}
      />
      <span className="inbox-hint">{t('inbox.hint')}</span>
      <button type="submit" className="primary" disabled={title.trim() === ''}>
        {t('inbox.add')}
      </button>
    </form>
  )
}
