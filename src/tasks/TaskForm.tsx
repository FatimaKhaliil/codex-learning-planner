import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../layout/Icon'
import { StatusSelect } from './StatusSelect'
import { emptyTask, taskErrorMessage, validateTask } from './model'
import type { TaskErrors, TaskInput } from './model'
interface Props { initial?: TaskInput; onSave: (value: TaskInput) => Promise<void>; onCancel: () => void }
export function TaskForm({ initial, onSave, onCancel }: Props) {
  const [value, setValue] = useState<TaskInput>(() => ({ ...(initial ?? emptyTask) }))
  const [errors, setErrors] = useState<TaskErrors>({})
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const lock = useRef(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (lock.current) return
    const nextErrors = validateTask(value)
    setErrors(nextErrors); setError('')
    const first = Object.keys(nextErrors)[0]
    if (first) { document.getElementById(`task-${first}`)?.focus(); return }
    lock.current = true; setPending(true)
    try { await onSave(value) } catch (cause) { setError(taskErrorMessage(cause)) }
    finally { lock.current = false; setPending(false) }
  }
  function update(field: keyof TaskInput, text: string) {
    setValue(previous => ({ ...previous, [field]: text }))
    setErrors(previous => ({ ...previous, [field]: undefined })); setError('')
  }
  return <section className="task-form-card" aria-labelledby="task-form-title">
    <h2 id="task-form-title">{initial ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}</h2>
    <p className="sr-only">Titel und Fälligkeitsdatum sind Pflichtfelder.</p>
    {error && <p className="notice error" role="alert">{error}</p>}
    {pending && <p role="status">Warten auf die Speicherbestätigung. Bei Verbindungsproblemen bitte diese Seite geöffnet lassen.</p>}
    <form noValidate onSubmit={submit} aria-busy={pending}><fieldset disabled={pending}>
      <legend className="sr-only">Aufgabendetails</legend><div className="fields">
      {(['title', 'description', 'dueDate', 'subject'] as const).map(field => <div className="field" key={field}>
        <label htmlFor={`task-${field}`}>{{ title: 'Titel', description: 'Beschreibung', dueDate: 'Fälligkeitsdatum', subject: 'Fach (optional)' }[field]}</label>
        {field === 'description' ? <textarea id={`task-${field}`} value={value[field]} maxLength={5000} onChange={event => update(field, event.target.value)} aria-invalid={!!errors[field]} aria-describedby={errors[field] ? `task-${field}-error` : undefined} placeholder="Notizen zu deiner Aufgabe" />
          : <input autoFocus={field === 'title'} id={`task-${field}`} type={field === 'dueDate' ? 'date' : 'text'} required={field === 'title' || field === 'dueDate'} value={value[field]} maxLength={field === 'title' ? 200 : field === 'subject' ? 100 : undefined} onChange={event => update(field, event.target.value)} aria-invalid={!!errors[field]} aria-describedby={errors[field] ? `task-${field}-error` : undefined} placeholder={field === 'title' ? 'Was möchtest du lernen?' : field === 'subject' ? 'z. B. Mathematik' : undefined} />}
        {errors[field] && <p className="field-error" id={`task-${field}-error`}>{errors[field]}</p>}
      </div>)}
      {initial && <div className="field task-edit-status"><label htmlFor="task-status">Status</label><StatusSelect id="task-status" label="Status" value={value.status} disabled={pending} onChange={status => update('status', status)} /></div>}
      </div><button className="primary-button" type="submit">{pending ? <span className="spinner" aria-hidden="true" /> : <Icon name={initial ? 'save' : 'plus'} />}{pending ? 'Wird gespeichert …' : initial ? 'Änderungen speichern' : 'Eintrag hinzufügen'}</button>
      <button className="secondary-button task-cancel" type="button" onClick={onCancel}>Abbrechen</button>
    </fieldset></form>
  </section>
}
