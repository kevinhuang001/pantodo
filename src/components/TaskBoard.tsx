import { TASK_STATUSES, type Task } from '@/domain/types'
import { STATUS_LABEL_KEYS } from '@/domain/display'
import { t } from '@/i18n'
import { TaskList, type TaskLookup } from './TaskList'
export function TaskBoard({ tasks, lookup }: { tasks: Task[]; lookup: TaskLookup }) {
  return (
    <div className="task-status-board">
      {TASK_STATUSES.map((status) => {
        const list = tasks.filter((task) => task.status === status)
        return (
          <section className={'status-column status-' + status} key={status}>
            <header>
              <span className="status-indicator" />
              <h2>{t(STATUS_LABEL_KEYS[status])}</h2>
              <span>{list.length}</span>
            </header>
            <TaskList tasks={list} lookup={lookup} presentation="gallery" emptyKey="group.empty" />
          </section>
        )
      })}
    </div>
  )
}
