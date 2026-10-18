import { SelectField } from './SelectField'
import { Input } from './ui/input'
import { useAppStore } from '@/domain/store'
import { STATUS_LABEL_KEYS } from '@/domain/display'
import { TASK_STATUSES } from '@/domain/types'
import type { PanelFilter } from '@/domain/types'
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
  const tags = useAppStore((s) => s.tags).filter((tag) => !tag.deletedAt)
  const projects = useAppStore((s) => s.projects).filter((project) => !project.deletedAt)
  return (
    <div className="filter-fields stack">
      <div className="field">
        <div className="filter-label-row">
          <span className="field-label">{t('view.field.filterTags')}</span>
          <SelectField
            className="compact-select"
            aria-label={t('view.field.filterTags')}
            value={value.tagMode}
            onValueChange={(tagMode) => onChange({ ...value, tagMode: tagMode as 'any' | 'all' })}
          >
            <option value="any">{t('view.tags.any')}</option>
            <option value="all">{t('view.tags.all')}</option>
          </SelectField>
        </div>
        <div className="chip-row" role="group" aria-label={t('view.field.filterTags')}>
          {tags.map((tag) => (
            <button
              type="button"
              key={tag.id}
              aria-pressed={value.tagIds.includes(tag.id)}
              className={
                value.tagIds.includes(tag.id) ? 'chip selectable selected' : 'chip selectable'
              }
              onClick={() =>
                onChange({
                  ...value,
                  tagIds: value.tagIds.includes(tag.id)
                    ? value.tagIds.filter((id) => id !== tag.id)
                    : [...value.tagIds, tag.id],
                })
              }
            >
              <span className="dot" style={{ background: tag.color ?? 'var(--accent)' }} />
              {tag.name}
            </button>
          ))}
        </div>
        <p className="field-hint">{t('editor.tagsHint')}</p>
      </div>
      <div className="field">
        <span className="field-label">{t('view.field.filterStatus')}</span>
        <div className="chip-row" role="group" aria-label={t('view.field.filterStatus')}>
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
            onValueChange={(id) =>
              onChange({
                ...value,
                projectMode: id === '__none' ? 'none' : 'any',
                projectIds: id && id !== '__none' ? [id] : [],
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
          <label htmlFor={prefix + '-text'}>{t('panel.text')}</label>
          <Input
            id={prefix + '-text'}
            className="input"
            value={value.text}
            onChange={(e) => onChange({ ...value, text: e.target.value })}
          />
        </div>
      </div>
    </div>
  )
}
