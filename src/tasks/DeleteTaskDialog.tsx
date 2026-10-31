import { useEffect, useRef } from 'react'
import type { Task } from './model'
export function DeleteTaskDialog({ task, pending, error, onConfirm, onCancel }: { task: Task; pending: boolean; error: string; onConfirm: () => void; onCancel: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialog.current?.showModal(); cancel.current?.focus()
    return () => { dialog.current?.close(); previous?.focus() }
  }, [])
  return <dialog ref={dialog} className="delete-dialog" aria-labelledby="delete-title" aria-describedby="delete-description" onCancel={event => { event.preventDefault(); if (!pending) onCancel() }}>
    <h2 id="delete-title">Aufgabe löschen?</h2><p id="delete-description">„{task.title}“ wird dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.</p>
    {error && <p className="notice error" role="alert">{error}</p>}
    <div className="dialog-actions"><button ref={cancel} className="secondary-button" disabled={pending} onClick={onCancel}>Abbrechen</button><button className="secondary-button danger" disabled={pending} onClick={onConfirm}>{pending ? 'Wird gelöscht …' : 'Endgültig löschen'}</button></div>
  </dialog>
}
