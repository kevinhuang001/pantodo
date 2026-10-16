import { useState } from 'react'
import type { CSSProperties } from 'react'

import { t } from '@/i18n'
import type { TaskGroup } from '@/domain/filters'
import type { View } from '@/domain/types'

import { Icon } from './Icon'
import { TaskList } from './TaskList'
import type { TaskLookup } from './TaskList'

interface GroupBoardProps {
  groups: TaskGroup[]
  lookup: TaskLookup
  view: View
  onReorderGroups: (from: number, to: number) => void
}

function groupLabel(group: TaskGroup): string {
  if (group.label !== null) return group.label
  if (group.labelKey !== null) return t(group.labelKey)
  return ''
}

/**
 * Renders one group per bucket, arranged vertically, as side-by-side columns, or as an N×M grid —
 * the arrangement the Eisenhower view uses to become a 2×2 matrix. Group headers are draggable.
 */
export function GroupBoard({ groups, lookup, view, onReorderGroups }: GroupBoardProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const isFlat = groups.length === 1 && groups[0]?.key === 'all'
  if (isFlat) {
    const only = groups[0]
    return (
      <TaskList
        tasks={only === undefined ? [] : only.tasks}
        lookup={lookup}
        emptyKey={view.preset === 'trash' ? 'empty.trashTitle' : 'empty.viewTitle'}
      />
    )
  }

  const columns =
    view.arrangement === 'vertical'
      ? 1
      : view.arrangement === 'columns'
        ? Math.max(groups.length, 1)
        : Math.max(view.gridColumns, 1)

  const style = { '--cols': String(columns) } as CSSProperties

  return (
    <div className="group-board" data-arrangement={view.arrangement} style={style}>
      {groups.map((group, index) => (
        <section
          className={dragIndex === index ? 'group dragging' : 'group'}
          key={group.key}
          onDragOver={(event) => {
            if (dragIndex !== null) event.preventDefault()
          }}
          onDrop={(event) => {
            event.preventDefault()
            if (dragIndex !== null && dragIndex !== index) onReorderGroups(dragIndex, index)
            setDragIndex(null)
          }}
        >
          <header
            className="group-head"
            draggable={view.groups.length > 1}
            onDragStart={() => setDragIndex(index)}
            onDragEnd={() => setDragIndex(null)}
          >
            {view.groups.length > 1 ? (
              <span className="drag-handle" aria-hidden="true">
                <Icon name="grip" size={14} />
              </span>
            ) : null}
            {group.color === null ? null : (
              <span className="dot" style={{ background: group.color }} />
            )}
            <h2>{groupLabel(group)}</h2>
            <span className="count">{group.tasks.length}</span>
          </header>
          <TaskList tasks={group.tasks} lookup={lookup} emptyKey="group.empty" />
        </section>
      ))}
    </div>
  )
}
