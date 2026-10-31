import { useRef, useState } from 'react'
import type { TaskRepository } from './repository'
import { TaskForm } from './TaskForm'
import { TaskList } from './TaskList'
import { DeleteTaskDialog } from './DeleteTaskDialog'
import { useTasks } from './useTasks'
import { taskErrorMessage } from './model'
import type { Task, TaskInput, TaskStatus } from './model'
export function TaskWorkspace({ repository }: { repository: TaskRepository | null }) {
  const { tasks, loading, error, hasMore, reload, loadMore } = useTasks(repository)
  const [editor, setEditor] = useState<Task | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Task | null>(null)
  const [pending, setPending] = useState(false)
  const [mutationError, setMutationError] = useState('')
  const [notice, setNotice] = useState('')
  const lock = useRef(false)
  const createId = useRef<string | null>(null)
  const addButton = useRef<HTMLButtonElement>(null)
  function closeEditor() { setEditor(null); createId.current = null; requestAnimationFrame(() => addButton.current?.focus()) }
  async function save(value: TaskInput) {
    if (!repository) throw new Error('not-configured')
    if (editor === 'new') {
      // Keep the same ID when retrying an uncertain write; never create duplicate tasks.
      createId.current ??= repository.newId()
      await repository.create(value, createId.current)
    } else if (editor) await repository.update(editor.id, value)
    closeEditor(); setNotice('Aufgabe gespeichert.'); await reload()
  }
  async function mutate(action: () => Promise<void>, message: string) {
    if (lock.current) return
    lock.current = true; setPending(true); setMutationError(''); setNotice('')
    try { await action(); setDeleting(null); setNotice(message); await reload() }
    catch (cause) { setMutationError(taskErrorMessage(cause)) }
    finally { lock.current = false; setPending(false) }
  }
  function changeStatus(task: Task, status: TaskStatus) {
    if (repository) void mutate(() => repository.setStatus(task.id, status), 'Status gespeichert.')
  }
  return <section className="tasks-panel" aria-labelledby="tasks-title">
    <div className="tasks-heading"><div><h2 id="tasks-title">Meine Aufgaben</h2><p>Deine nächsten Lernschritte an einem Ort.</p></div>
      <button ref={addButton} className="primary-button add-task" disabled={!repository || pending || loading || editor !== null} onClick={() => { setNotice(''); setEditor('new') }}>Aufgabe hinzufügen</button></div>
    {notice && <p className="notice success" role="status">{notice}</p>}
    {pending && <p role="status">Änderung wird gespeichert. Bei Verbindungsproblemen kann dies länger dauern. Bitte lasse diese Seite geöffnet.</p>}
    {editor !== null ? <TaskForm key={editor === 'new' ? 'new' : editor.id} initial={editor === 'new' ? undefined : editor} onSave={save} onCancel={closeEditor} /> : <>
      {loading && <p role="status"><span className="spinner" aria-hidden="true" /> Aufgaben werden geladen …</p>}
      {error && <div className="notice error" role="alert"><p>{error}</p><button className="secondary-button" disabled={loading} onClick={() => void reload()}>Erneut versuchen</button></div>}
      {mutationError && !deleting && <p className="notice error" role="alert">{mutationError}</p>}
      {!loading && !error && tasks.length === 0 && <div className="task-empty"><h3>Noch keine Aufgaben</h3><p>Erstelle deine erste Aufgabe und plane deinen nächsten Lernschritt.</p></div>}
      <TaskList tasks={tasks} disabled={pending || loading || !!error} onEdit={task => { setNotice(''); setEditor(task) }} onDelete={task => { setMutationError(''); setDeleting(task) }} onStatus={changeStatus} />
      {hasMore && <button className="secondary-button" disabled={loading || pending} onClick={() => void loadMore()}>Weitere Aufgaben laden</button>}
    </>}
    {deleting && <DeleteTaskDialog task={deleting} pending={pending} error={mutationError} onCancel={() => { setDeleting(null); setMutationError('') }} onConfirm={() => { if (repository) void mutate(() => repository.remove(deleting.id), 'Aufgabe gelöscht.') }} />}
  </section>
}
