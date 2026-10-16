import { useState } from 'react'

import type { Task } from '@/domain/types'
import { useAppStore } from '@/domain/store'
import { getLocale, t } from '@/i18n'
import { Icon } from './Icon'
import { PaperFriend } from './PaperFriend'
import { TaskList } from './TaskList'
import type { TaskLookup } from './TaskList'

/** Visual composition study; no saved panel model is introduced in this UI review. */
export function PanelPreview({ lookup }: { lookup: TaskLookup }) {
  const tasks = useAppStore((state) => state.tasks)
  const [layout, setLayout] = useState<'grid' | 'vertical'>('grid')
  const openTasks = tasks.filter(
    (task) =>
      task.deletedAt === null &&
      task.archivedAt === null &&
      task.status !== 'done' &&
      task.status !== 'cancelled',
  )
  const panels: {
    title: string
    caption: string
    icon: 'sun' | 'folder' | 'calendarCheck'
    color: string
    tasks: Task[]
  }[] = [
    {
      title: t('panels.focus'),
      caption: t('panels.focusRule'),
      icon: 'sun',
      color: 'sage',
      tasks: openTasks.filter((task) => task.projectId !== null),
    },
    {
      title: t('panels.life'),
      caption: t('panels.lifeRule'),
      icon: 'calendarCheck',
      color: 'butter',
      tasks: openTasks.filter((task) => task.projectId === null),
    },
    {
      title: t('panels.done'),
      caption: t('panels.doneRule'),
      icon: 'folder',
      color: 'lilac',
      tasks: tasks.filter(
        (task) => task.deletedAt === null && task.archivedAt === null && task.status === 'done',
      ),
    },
  ]
  return (
    <div className="panel-preview">
      <div className="page-intro">
        <div>
          <span className="little-label">{t('panels.eyebrow')}</span>
          <h2>
            {t('panels.title')}
            <span className="heading-spark">✳</span>
          </h2>
          <p>{t('panels.subtitle')}</p>
        </div>
        <PaperFriend small />
      </div>
      <div className="view-strip">
        <span className="view-caption">
          <Icon name="layers" size={15} />
          {t('panels.preview')}
        </span>
        <span className="toolbar-spacer" />
        <div className="layout-pills" role="group" aria-label={t('toolbar.arrangement')}>
          <button
            type="button"
            className={layout === 'grid' ? 'active' : ''}
            aria-pressed={layout === 'grid'}
            onClick={() => setLayout('grid')}
          >
            <Icon name="grid" size={14} />
            {t('toolbar.arrange.grid')}
          </button>
          <button
            type="button"
            className={layout === 'vertical' ? 'active' : ''}
            aria-pressed={layout === 'vertical'}
            onClick={() => setLayout('vertical')}
          >
            <Icon name="rows" size={14} />
            {t('toolbar.arrange.vertical')}
          </button>
        </div>
      </div>
      <div className={'preview-panels ' + layout}>
        {panels.map((panel, index) => (
          <section className={'preview-panel panel-' + panel.color} key={panel.title}>
            <header>
              <span className="panel-icon">
                <Icon name={panel.icon} size={18} />
              </span>
              <h3>{panel.title}</h3>
              <span className="panel-count">{String(panel.tasks.length).padStart(2, '0')}</span>
              <span className="panel-number">0{index + 1}</span>
            </header>
            <div className="panel-rule">
              <Icon name="sliders" size={12} />
              {panel.caption}
            </div>
            <TaskList tasks={panel.tasks} lookup={lookup} emptyKey="group.empty" />
            <footer>
              {panel.tasks.length} {t('panels.items')}
              <span>
                {new Intl.DateTimeFormat(getLocale(), { month: 'short', day: 'numeric' }).format(
                  lookup.now,
                )}
              </span>
            </footer>
          </section>
        ))}
      </div>
      <p className="preview-footnote">
        <Icon name="layers" size={14} />
        {t('panels.note')}
      </p>
    </div>
  )
}
