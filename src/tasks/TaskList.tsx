import { statusLabels, taskStatuses } from './model'
import type { Task, TaskStatus } from './model'
interface Props { tasks: Task[]; disabled: boolean; onEdit: (task: Task) => void; onDelete: (task: Task) => void; onStatus: (task: Task, status: TaskStatus) => void }
export function TaskList({ tasks, disabled, onEdit, onDelete, onStatus }: Props) {
  return <ul className="task-list">{tasks.map(task => <li key={task.id} className="task-card">
    <span className="subject-badge" aria-hidden="true">{task.subject.slice(0, 1).toUpperCase() || 'A'}</span>
    <div className="task-copy"><h3>{task.title}</h3><p>{task.subject && `${task.subject} · `}Fällig am <time dateTime={task.dueDate}>{task.dueDate.split('-').reverse().join('.')}</time></p>{task.description && <p className="task-description">{task.description}</p>}</div>
    <div className="task-actions"><label className="sr-only" htmlFor={`status-${task.id}`}>Status für {task.title}</label>
      <select className={`task-status ${task.status}`} id={`status-${task.id}`} value={task.status} disabled={disabled} onChange={event => onStatus(task, event.target.value as TaskStatus)}>{taskStatuses.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}</select>
      <button className="secondary-button" disabled={disabled} onClick={() => onEdit(task)} aria-label={`${task.title} bearbeiten`}>Bearbeiten</button>
      <button className="secondary-button danger" disabled={disabled} onClick={() => onDelete(task)} aria-label={`${task.title} löschen`}>Löschen</button>
    </div>
  </li>)}</ul>
}
