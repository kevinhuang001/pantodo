import { Popover, PopoverTrigger, PopoverContent } from './ui/popover'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { SelectField } from './SelectField'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import { validatePlan } from '@/domain/calendar'
import { fromLocalInputValue } from '@/domain/date'
import { ScheduleFields } from './ScheduleFields'
import type { ScheduleValues } from './ScheduleFields'
import { useAppStore } from '@/domain/store'
import { t } from '@/i18n'
import { pickQuote, quoteText, rememberQuote } from '@/domain/quotes'
import { Button } from './ui/button'

import { Icon } from './Icon'
import { PaperFriend } from './PaperFriend'

/** A single writing surface with optional task metadata. */
export function InboxComposer() {
  const createTask = useAppStore((state) => state.createTask)
  const projects = useAppStore((state) => state.projects).filter((item) => item.deletedAt === null)
  const tags = useAppStore((state) => state.tags).filter((item) => item.deletedAt === null)
  const [quote] = useState(pickQuote)
  useEffect(() => rememberQuote(quote), [quote])
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [projectId, setProjectId] = useState('')
  const [tagIds, setTagIds] = useState<string[]>([])
  const [showTime, setShowTime] = useState(false)
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
      setShowTime(false)
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
            className="capture-notes"
            aria-label={t('task.field.notes')}
            placeholder={t('create.notes')}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
          />
          <Button
            variant="ghost"
            type="button"
            className="capture-time-toggle"
            aria-expanded={showTime}
            onClick={() => setShowTime(!showTime)}
          >
            <Icon name="calendar" size={14} />
            {t('plan.more')}
            <Icon name="chevronDown" size={12} />
            {time.start ? <span className="status-dot" /> : null}
          </Button>
          {showTime ? <ScheduleFields prefix="create" value={time} onChange={setTime} /> : null}
          {timeError ? (
            <p role="alert" className="form-error">
              {t('time.invalidRange')}
            </p>
          ) : null}
          <div className="capture-card-bottom">
            <div className="capture-options">
              <div className="capture-select">
                <Icon name="folder" size={15} />
                <SelectField
                  aria-label={t('task.field.project')}
                  value={projectId}
                  onValueChange={(event) => setProjectId(event)}
                >
                  <option value="">{t('task.field.project')}</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </SelectField>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="capture-select">
                    <Icon name="tag" size={14} />
                    {t('task.field.tags')}
                    {tagIds.length ? ' · ' + tagIds.length : ''}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="capture-tag-popover" align="start">
                  {tags.map((tag) => (
                    <button
                      type="button"
                      key={tag.id}
                      aria-pressed={tagIds.includes(tag.id)}
                      onClick={() =>
                        setTagIds((current) =>
                          current.includes(tag.id)
                            ? current.filter((id) => id !== tag.id)
                            : [...current, tag.id],
                        )
                      }
                    >
                      {tagIds.includes(tag.id) ? '✓ ' : ''}
                      {tag.name}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
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
