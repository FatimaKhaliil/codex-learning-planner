import { useEffect, useRef, useState } from 'react'
import { Icon } from '../layout/Icon'
import { StatusSelect } from './StatusSelect'
import type { Task, TaskStatus } from './model'
interface Props { tasks: Task[]; disabled: boolean; onEdit: (task: Task) => void; onDelete: (task: Task) => void; onStatus: (task: Task, status: TaskStatus) => void }
function TaskActions({ task, disabled, onEdit, onDelete }: Pick<Props, 'disabled' | 'onEdit' | 'onDelete'> & { task: Task }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', key)
    root.current?.querySelector<HTMLButtonElement>('.task-menu button')?.focus()
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', key) }
  }, [open])
  return <div ref={root} className="task-action-menu"><button ref={trigger} className="icon-button" aria-label={`Aktionen für ${task.title}`} aria-expanded={open} disabled={disabled} onClick={() => setOpen(value => !value)}><Icon name="more" /></button>
    {open && <div className="task-menu" role="group" aria-label={`Aktionen für ${task.title}`}><button disabled={disabled} onClick={() => { setOpen(false); onEdit(task) }}><Icon name="edit" />Bearbeiten</button><button className="danger" disabled={disabled} onClick={() => { setOpen(false); onDelete(task) }}><Icon name="trash" />Löschen</button></div>}
  </div>
}
export function TaskList({ tasks, disabled, onEdit, onDelete, onStatus }: Props) {
  return <ul className="task-list">{tasks.map(task => <li key={task.id} className="task-card">
    <span className={`subject-badge subject-${task.status}`} aria-hidden="true">{(task.subject || task.title).slice(0, 1).toLocaleUpperCase('de')}</span>
    <div className="task-copy"><h3>{task.title}</h3><p>{task.subject && `${task.subject} · `}Fällig am <time dateTime={task.dueDate}>{task.dueDate.split('-').reverse().join('.')}</time></p></div>
    <div className="task-actions"><StatusSelect value={task.status} disabled={disabled} onChange={status => onStatus(task, status)} label={`Status für ${task.title}`} /><TaskActions task={task} disabled={disabled} onEdit={onEdit} onDelete={onDelete} /></div>
  </li>)}</ul>
}
