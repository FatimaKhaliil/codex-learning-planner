import { useEffect, useRef } from 'react'
import { Icon } from '../layout/Icon'
import { statusLabels } from './model'
import type { Task } from './model'
// Figma uses an in-page confirmation card, not a modal overlay.
export function DeleteTaskDialog({ task, pending, error, onConfirm, onCancel }: { task: Task; pending: boolean; error: string; onConfirm: () => void; onCancel: () => void }) {
  const root = useRef<HTMLElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    cancel.current?.focus()
    root.current?.scrollIntoView({ block: 'nearest' })
  }, [])
  return <section ref={root} className="delete-confirmation" aria-labelledby="delete-title" onKeyDown={event => { if (event.key === 'Escape' && !pending) onCancel() }}>
    <h2 id="delete-title">Aufgabe löschen?</h2><p>Möchtest du diesen Eintrag wirklich löschen? Diese Aktion kann später nicht rückgängig gemacht werden.</p>
    <h3>{task.title}</h3><p>Fällig am {task.dueDate.split('-').reverse().join('.')}</p><span className={`status-label ${task.status}`}>{statusLabels[task.status]}</span>
    {error && <p className="notice error" role="alert">{error}</p>}
    <div className="confirmation-actions"><button className="secondary-button danger" disabled={pending} onClick={onConfirm}><Icon name="trashLarge" />{pending ? 'Wird gelöscht …' : 'Aufgabe löschen'}</button><button ref={cancel} className="secondary-button" disabled={pending} onClick={onCancel}>Abbrechen</button></div>
  </section>
}
