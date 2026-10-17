import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { CaptureEntityPicker } from './CaptureEntityPicker'
import { CaptureEstimatePicker } from './CaptureEstimatePicker'
import { CaptureSchedulePicker } from './CaptureSchedulePicker'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'

import { validatePlan } from '@/domain/calendar'
import { fromLocalInputValue } from '@/domain/date'
import type { ScheduleValues } from '@/domain/planning'
import { useAppStore } from '@/domain/store'
import { t } from '@/i18n'
import { pickQuote, quoteText, rememberQuote } from '@/domain/quotes'
import { Button } from './ui/button'

import { Icon } from './Icon'
import { PaperFriend } from './PaperFriend'

/** A single writing surface with optional task metadata. */
export function InboxComposer() {
  const createTask = useAppStore((state) => state.createTask)
  const [quote] = useState(pickQuote)
  useEffect(() => rememberQuote(quote), [quote])
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const notesRef = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const element = notesRef.current
    if (!element) return
    const resize = () => {
      element.style.height = '0px'
      element.style.height = Math.max(82, element.scrollHeight + 2) + 'px'
    }
    resize()
    let width = element.clientWidth
    const observer = new ResizeObserver(() => {
      if (width !== element.clientWidth) {
        width = element.clientWidth
        resize()
      }
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [notes])
  const [projectId, setProjectId] = useState('')
  const [tagIds, setTagIds] = useState<string[]>([])
  const [time, setTime] = useState<ScheduleValues>({ start: '', end: '', due: '', estimate: '' })
  const [timeError, setTimeError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!title.trim() || saving) return
    setSaving(true)
    setError(false)
    setTimeError(false)
    try {
      const startAt = time.start ? fromLocalInputValue(time.start) : null
      const endAt = time.end ? fromLocalInputValue(time.end) : null
      validatePlan(startAt, endAt)
      await createTask({
        startAt,
        endAt,
        dueAt: time.due ? fromLocalInputValue(time.due) : null,
        estimateMinutes: time.estimate ? Number(time.estimate) : null,
        title: title.trim(),
        notes: notes.trim(),
        projectId: projectId || null,
        tagIds,
      })
      setTitle('')
      setNotes('')
      setTime({ start: '', end: '', due: '', estimate: '' })
      document.getElementById('pantodo-inbox-input')?.focus()
    } catch (failure) {
      if (failure instanceof Error && failure.message === 'time.invalidRange') setTimeError(true)
      else setError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="capture-desk" aria-label={t('nav.inbox')}>
      <div className="capture-center">
        <div className="capture-greeting">
          <PaperFriend />
          <h2 aria-label={t('create.quoteLabel')}>{quoteText(quote)}</h2>
        </div>
        <form className="capture-card" onSubmit={(event) => void submit(event)}>
          <label className="visually-hidden" htmlFor="pantodo-inbox-input">
            {t('inbox.placeholder')}
          </label>
          <Input
            id="pantodo-inbox-input"
            className="capture-title"
            value={title}
            autoComplete="off"
            placeholder={t('inbox.placeholder')}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Textarea
            ref={notesRef}
            className="capture-notes"
            aria-label={t('task.field.notes')}
            placeholder={t('create.notes')}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
          />
          {timeError ? (
            <p role="alert" className="form-error">
              {t('time.invalidRange')}
            </p>
          ) : null}
          <div className="capture-card-bottom">
            <div className="capture-options">
              <CaptureSchedulePicker value={time} onChange={setTime} />
              <CaptureEstimatePicker
                value={time.estimate}
                onChange={(estimate) => setTime((current) => ({ ...current, estimate }))}
              />
              {(['project', 'tags'] as const).map((kind) => (
                <CaptureEntityPicker
                  key={kind}
                  kind={kind}
                  projectId={projectId}
                  tagIds={tagIds}
                  onProjectChange={setProjectId}
                  onTagsChange={setTagIds}
                />
              ))}
            </div>
            <Button type="submit" className="capture-submit" disabled={!title.trim() || saving}>
              {t('create.add')}
              <Icon name="plus" size={17} />
            </Button>
          </div>
          {error ? (
            <p role="alert" className="capture-error">
              {t('create.error')}
            </p>
          ) : null}
        </form>
      </div>
    </section>
  )
}
