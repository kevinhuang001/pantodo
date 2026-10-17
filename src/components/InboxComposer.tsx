import { useState } from 'react'
import type { FormEvent } from 'react'

import { validatePlan } from '@/domain/calendar'
import { fromLocalInputValue } from '@/domain/date'
import { ScheduleFields } from './ScheduleFields'
import type { ScheduleValues } from './ScheduleFields'
import { useAppStore } from '@/domain/store'
import { getLocale, t } from '@/i18n'

import { Icon } from './Icon'
import { PaperFriend } from './PaperFriend'

/** A quiet capture desk. Real task titles in the background are strictly decorative. */
export function InboxComposer() {
  const createTask = useAppStore((state) => state.createTask)
  const tasks = useAppStore((state) => state.tasks)
  const projects = useAppStore((state) => state.projects).filter((item) => item.deletedAt === null)
  const tags = useAppStore((state) => state.tags).filter((item) => item.deletedAt === null)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [projectId, setProjectId] = useState('')
  const [tagIds, setTagIds] = useState<string[]>([])
  const [showTime, setShowTime] = useState(false)
  const [time, setTime] = useState<ScheduleValues>({ start: '', end: '', due: '', estimate: '' })
  const [timeError, setTimeError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  const openTasks = tasks.filter(
    (task) =>
      task.deletedAt === null &&
      task.archivedAt === null &&
      task.status !== 'done' &&
      task.status !== 'cancelled',
  )

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
      <div className="desk-notes" aria-hidden="true">
        {openTasks.slice(-6).map((task, index) => (
          <div key={task.id} className={'scattered-note note-' + index}>
            <span className="note-tape" />
            <span className="note-mini-check" />
            <p>{task.title}</p>
            <span className="note-lines">
              <i />
              <i />
            </span>
            <span className="note-doodle">{index % 2 === 0 ? '✳' : '↗'}</span>
          </div>
        ))}
        <span className="desk-spark spark-one">✳</span>
        <span className="desk-spark spark-two">✧</span>
        <svg className="desk-squiggle" viewBox="0 0 100 50">
          <path d="M4 36Q29 5 41 27T70 22Q81 8 94 12M88 5L96 12L89 21" />
        </svg>
      </div>
      <div className="capture-center">
        <span className="little-label">
          <span />
          {t('create.eyebrow')}
        </span>
        <PaperFriend />
        <h2>{t('create.title')}</h2>
        <p className="capture-subtitle">{t('create.subtitle')}</p>
        <form className="capture-card" onSubmit={(event) => void submit(event)}>
          <label className="visually-hidden" htmlFor="pantodo-inbox-input">
            {t('inbox.placeholder')}
          </label>
          <input
            id="pantodo-inbox-input"
            className="capture-title"
            value={title}
            autoComplete="off"
            placeholder={t('inbox.placeholder')}
            onChange={(event) => setTitle(event.target.value)}
          />
          <textarea
            className="capture-notes"
            aria-label={t('task.field.notes')}
            placeholder={t('create.notes')}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
          />
          <button
            type="button"
            className="capture-time-toggle"
            aria-expanded={showTime}
            onClick={() => setShowTime(!showTime)}
          >
            <Icon name="calendar" size={14} />
            {t('plan.more')}
            <Icon name="chevronDown" size={12} />
            {time.start ? <span className="status-dot" /> : null}
          </button>
          {showTime ? <ScheduleFields prefix="create" value={time} onChange={setTime} /> : null}
          {timeError ? (
            <p role="alert" className="form-error">
              {t('time.invalidRange')}
            </p>
          ) : null}
          <div className="capture-card-bottom">
            <div className="capture-options">
              <label className="capture-select">
                <Icon name="folder" size={15} />
                <select
                  aria-label={t('task.field.project')}
                  value={projectId}
                  onChange={(event) => setProjectId(event.target.value)}
                >
                  <option value="">{t('task.field.project')}</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
              <details className="capture-tags">
                <summary className="capture-select">
                  <Icon name="tag" size={14} />
                  {t('task.field.tags')}
                  {tagIds.length ? ' · ' + tagIds.length : ''}
                </summary>
                <div className="capture-tag-options">
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
                </div>
              </details>
            </div>
            <button type="submit" className="capture-submit" disabled={!title.trim() || saving}>
              {t('create.add')}
              <Icon name="plus" size={17} />
            </button>
          </div>
          {error ? (
            <p role="alert" className="capture-error">
              {t('create.error')}
            </p>
          ) : null}
        </form>
        <p className="capture-hint">
          <kbd>Enter ↵</kbd>
          {t('create.hint')}
        </p>
      </div>
      <footer className="desk-footer">
        <span className="tiny-flower">✳</span>
        <span>{t('create.footer')}</span>
        <span>
          {new Intl.NumberFormat(getLocale(), { minimumIntegerDigits: 2 }).format(openTasks.length)}{' '}
          {t('create.waiting')}
        </span>
      </footer>
    </section>
  )
}
