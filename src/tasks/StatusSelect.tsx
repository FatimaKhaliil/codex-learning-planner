import { Icon } from '../layout/Icon'
import { statusLabels, taskStatuses } from './model'
import type { TaskStatus } from './model'
export function StatusSelect({ value, onChange, label, disabled, id }: { value: TaskStatus; onChange: (value: TaskStatus) => void; label: string; disabled?: boolean; id?: string }) {
  return <div className={`status-control ${value}`}><span className="status-dot" /><select id={id} aria-label={label} value={value} disabled={disabled} onChange={event => onChange(event.target.value as TaskStatus)}>{taskStatuses.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}</select><Icon name={value === 'open' ? 'downOpen' : value === 'done' ? 'downDone' : 'downProgress'} /></div>
}
