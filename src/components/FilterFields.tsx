import { SelectField } from './SelectField'
import { Input } from './ui/input'
import { DateTimeField } from './DateTimeField'
import { useAppStore } from '@/domain/store'
import { STATUS_LABEL_KEYS } from '@/domain/display'
import { TASK_STATUSES } from '@/domain/types'
import type { PanelFilter } from '@/domain/types'
import { fromLocalInputValue, toLocalInputValue } from '@/domain/date'
import { t } from '@/i18n'
export function FilterFields({
  value,
  onChange,
  prefix,
}: {
  value: PanelFilter
  onChange: (filter: PanelFilter) => void
  prefix: string
}) {
  const tags = useAppStore((s) => s.tags).filter((tag) => !tag.deletedAt),
    projects = useAppStore((s) => s.projects).filter((p) => !p.deletedAt)
  const toggle = (key: 'tagIds' | 'excludeTagIds', id: string) => {
    const current = value[key] ?? []
    onChange({
      ...value,
      [key]: current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    })
  }
  return (
    <div className="filter-fields stack">
      <div className="field">
        <label>{t('view.field.filterTags')}</label>
        <div className="chip-row">
          {tags.map((tag) => (
            <button
              type="button"
              key={tag.id}
              aria-pressed={value.tagIds.includes(tag.id)}
              className={
                value.tagIds.includes(tag.id) ? 'chip selectable selected' : 'chip selectable'
              }
              onClick={() => toggle('tagIds', tag.id)}
            >
              {tag.name}
            </button>
          ))}
          <SelectField
            className="compact-select"
            aria-label={t('view.field.filterTags')}
            value={value.tagMode}
            onValueChange={(e) => onChange({ ...value, tagMode: e as 'any' | 'all' })}
          >
            <option value="any">{t('view.tags.any')}</option>
            <option value="all">{t('view.tags.all')}</option>
          </SelectField>
        </div>
      </div>
      <div className="field">
        <label>{t('panel.exclude')}</label>
        <div className="chip-row">
          {tags.map((tag) => (
            <button
              type="button"
              key={tag.id}
              aria-pressed={(value.excludeTagIds ?? []).includes(tag.id)}
              className={
                (value.excludeTagIds ?? []).includes(tag.id)
                  ? 'chip selectable selected'
                  : 'chip selectable'
              }
              onClick={() => toggle('excludeTagIds', tag.id)}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>{t('view.field.filterStatus')}</label>
        <div className="chip-row">
          {TASK_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={value.statuses.includes(status)}
              className={
                value.statuses.includes(status) ? 'chip selectable selected' : 'chip selectable'
              }
              onClick={() =>
                onChange({
                  ...value,
                  statuses: value.statuses.includes(status)
                    ? value.statuses.filter((s) => s !== status)
                    : [...value.statuses, status],
                })
              }
            >
              {t(STATUS_LABEL_KEYS[status])}
            </button>
          ))}
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor={prefix + '-project'}>{t('task.field.project')}</label>
          <SelectField
            id={prefix + '-project'}
            className="select"
            value={value.projectMode === 'none' ? '__none' : (value.projectIds[0] ?? '')}
            onValueChange={(e) =>
              onChange({
                ...value,
                projectMode: e === '__none' ? 'none' : 'any',
                projectIds: e && e !== '__none' ? [e] : [],
              })
            }
          >
            <option value="">{t('stats.allProjects')}</option>
            <option value="__none">{t('panel.noProject')}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.emoji} {project.name}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="field">
          <label htmlFor={prefix + '-time'}>{t('plan.title')}</label>
          <SelectField
            id={prefix + '-time'}
            className="select"
            value={value.hasTime}
            onValueChange={(e) => onChange({ ...value, hasTime: e as PanelFilter['hasTime'] })}
          >
            <option value="any">{t('panel.anyTime')}</option>
            <option value="scheduled">{t('panel.scheduled')}</option>
            <option value="unscheduled">{t('panel.unscheduled')}</option>
          </SelectField>
        </div>
      </div>
      <div className="field">
        <label htmlFor={prefix + '-text'}>{t('panel.text')}</label>
        <Input
          id={prefix + '-text'}
          className="input"
          value={value.text}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
        />
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor={prefix + '-from'}>
            {t('task.field.due')} · {t('stats.from')}
          </label>
          <DateTimeField
            id={prefix + '-from'}

            value={value.dueFrom ? toLocalInputValue(value.dueFrom) : ''}
            onChange={(next) =>
              onChange({
                ...value,
                dueFrom: next ? fromLocalInputValue(next) : undefined,
              })
            }
          />
        </div>
        <div className="field">
          <label htmlFor={prefix + '-to'}>
            {t('task.field.due')} · {t('stats.to')}
          </label>
          <DateTimeField
            id={prefix + '-to'}

            value={value.dueTo ? toLocalInputValue(value.dueTo) : ''}
            onChange={(next) =>
              onChange({
                ...value,
                dueTo: next ? fromLocalInputValue(next) : undefined,
              })
            }
          />
        </div>
      </div>
    </div>
  )
}
