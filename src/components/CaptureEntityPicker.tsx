import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { Check, Folder, Search, Tag as TagIcon } from 'lucide-react'
import { useAppStore } from '@/domain/store'
import { t } from '@/i18n'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Checkbox } from './ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { colorFor } from '@/domain/filters'
import { TAG_PALETTE } from '@/domain/palette'
export function CaptureEntityPicker({
  kind,
  projectId,
  tagIds,
  onProjectChange,
  onTagsChange,
}: {
  kind: 'project' | 'tags'
  projectId: string
  tagIds: string[]
  onProjectChange: (id: string) => void
  onTagsChange: (ids: string[]) => void
}) {
  const projects = useAppStore((s) => s.projects).filter((p) => !p.deletedAt),
    tags = useAppStore((s) => s.tags).filter((tag) => !tag.deletedAt)
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState('')
  const listRef = useRef<HTMLDivElement>(null),
    labelId = useId()
  const isProject = kind === 'project',
    selectedProject = projects.find((p) => p.id === projectId)
  const title = t(isProject ? 'task.field.project' : 'task.field.tags')
  const foundProjects = projects.filter((p) =>
    p.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  )
  const foundTags = tags.filter((tag) =>
    tag.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  )
  const selectedTags = tags.filter((tag) => tagIds.includes(tag.id))
  const moveFocus = (event: KeyboardEvent<HTMLElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    const choices = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>('[role="option"], [role="checkbox"]') ?? [],
    )
    if (!choices.length) return
    event.preventDefault()
    const index = choices.indexOf(document.activeElement as HTMLElement)
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? choices.length - 1
          : event.key === 'ArrowDown'
            ? (index + 1) % choices.length
            : index <= 0
              ? choices.length - 1
              : index - 1
    choices[next]?.focus()
  }
  const chooseProject = (id: string) => {
    onProjectChange(id)
    setOpen(false)
  }
  return (
    <Popover
      open={open}
      onOpenChange={(value) => {
        setOpen(value)
        if (!value) setSearch('')
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          type="button"
          className="capture-property"
          data-filled={isProject ? !!projectId : !!tagIds.length}
          aria-label={title}
        >
          {isProject ? (
            selectedProject ? (
              <span className="capture-project-emoji">{selectedProject.emoji || '📁'}</span>
            ) : (
              <Folder size={15} />
            )
          ) : (
            <TagIcon size={15} />
          )}
          <span>
            {isProject
              ? selectedProject?.name || title
              : selectedTags.length
                ? selectedTags
                    .slice(0, 2)
                    .map((tag) => tag.name)
                    .join('、') + (selectedTags.length > 2 ? ' +' + (selectedTags.length - 2) : '')
                : title}
          </span>
          {!isProject && selectedTags.length ? (
            <span className="capture-tag-dots" aria-hidden="true">
              {selectedTags.slice(0, 3).map((tag) => (
                <i key={tag.id} style={{ background: colorFor(tag, TAG_PALETTE) }} />
              ))}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="capture-entity-picker"
        align="start"
        sideOffset={9}
        collisionPadding={12}
      >
        <div className="capture-picker-search">
          <Search size={15} />
          <Input
            aria-label={t(isProject ? 'picker.searchProjects' : 'picker.searchTags')}
            placeholder={t(isProject ? 'picker.searchProjects' : 'picker.searchTags')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={moveFocus}
          />
        </div>
        <div className="capture-picker-label" id={labelId}>
          {title}
          {!isProject && tagIds.length ? <span>{tagIds.length}</span> : null}
        </div>
        <div
          className="capture-picker-list"
          ref={listRef}
          role={isProject ? 'listbox' : 'group'}
          aria-labelledby={labelId}
          onKeyDown={moveFocus}
        >
          {isProject ? (
            <>
              {!search ? (
                <Button
                  variant="ghost"
                  role="option"
                  aria-selected={!projectId}
                  data-value=""
                  onClick={() => chooseProject('')}
                >
                  <Folder size={16} />
                  <span>{t('picker.noProject')}</span>
                  {!projectId ? <Check size={14} /> : null}
                </Button>
              ) : null}
              {foundProjects.map((project) => (
                <Button
                  variant="ghost"
                  role="option"
                  key={project.id}
                  data-value={project.id}
                  aria-selected={projectId === project.id}
                  onClick={() => chooseProject(project.id)}
                >
                  <span className="capture-project-emoji">{project.emoji || '📁'}</span>
                  <span>{project.name}</span>
                  {projectId === project.id ? <Check size={14} /> : null}
                </Button>
              ))}
            </>
          ) : (
            foundTags.map((tag) => (
              <label className="capture-tag-choice" key={tag.id}>
                <Checkbox
                  checked={tagIds.includes(tag.id)}
                  onCheckedChange={(checked) =>
                    onTagsChange(
                      checked ? [...tagIds, tag.id] : tagIds.filter((id) => id !== tag.id),
                    )
                  }
                />
                <span className="dot" style={{ background: colorFor(tag, TAG_PALETTE) }} />
                <span>{tag.name}</span>
              </label>
            ))
          )}
          {(isProject ? !foundProjects.length && !!search : !foundTags.length) ? (
            <p className="capture-picker-empty">{t('picker.noResults')}</p>
          ) : null}
        </div>
        {!isProject ? (
          <footer className="capture-picker-footer">
            <Button
              variant="ghost"
              size="sm"
              disabled={!tagIds.length}
              onClick={() => onTagsChange([])}
            >
              {t('picker.clearSelection')}
            </Button>
            <Button size="sm" onClick={() => setOpen(false)}>
              {t('picker.done')}
            </Button>
          </footer>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
