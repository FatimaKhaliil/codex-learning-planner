import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { AppLayout } from '../layout/AppLayout'
import type { AppIdentity, AppView } from '../layout/AppLayout'
import { Icon } from '../layout/Icon'
import { CalendarView, initialCalendarSelection } from '../calendar/CalendarView'
import type { TaskRepository } from './repository'
import { TaskForm } from './TaskForm'
import { TaskList } from './TaskList'
import { DeleteTaskDialog } from './DeleteTaskDialog'
import { ProgressCard } from './ProgressCard'
import { useTasks } from './useTasks'
import { filterTasks, taskProgress } from './queries'
import type { TaskFilter } from './queries'
import { statusLabels, taskErrorMessage, taskStatuses } from './model'
import type { Task, TaskInput, TaskStatus } from './model'
const DashboardView = lazy(() => import('../dashboard/DashboardView').then(module => ({ default: module.DashboardView })))
const ProfileView = lazy(() => import('../profile/ProfileView').then(module => ({ default: module.ProfileView })))
interface Props { repository: TaskRepository | null; view?: AppView; identity?: AppIdentity; onLogout?: () => void; loggingOut?: boolean; logoutError?: string }
export function TaskWorkspace({ repository, view = 'tasks', identity, onLogout = () => {}, loggingOut = false, logoutError }: Props) {
  const { tasks, loading, error, reload } = useTasks(repository)
  const [calendar, setCalendar] = useState(initialCalendarSelection)
  const [editor, setEditor] = useState<Task | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Task | null>(null)
  const [pending, setPending] = useState(false)
  const [mutationError, setMutationError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<TaskFilter>('all')
  const [visible, setVisible] = useState(50)
  const lock = useRef(false)
  const createId = useRef<string | null>(null)
  const content = useRef<HTMLDivElement>(null)
  const progress = useMemo(() => taskProgress(tasks), [tasks])
  const filtered = useMemo(() => filterTasks(tasks, search, filter), [tasks, search, filter])
  useEffect(() => { setVisible(50) }, [search, filter])
  useEffect(() => { if (view !== 'tasks') { setEditor(null); setDeleting(null); setNotice(''); createId.current = null } }, [view])
  function focusHeading() { requestAnimationFrame(() => content.current?.querySelector<HTMLElement>('[data-page-heading]')?.focus()) }
  function closeEditor() { setEditor(null); createId.current = null; focusHeading() }
  function begin(value: Task | 'new') { setNotice(''); setEditor(value); setDeleting(null); if (identity && view !== 'tasks') window.location.hash = '#/tasks' }
  async function save(value: TaskInput) {
    if (!repository) throw new Error('not-configured')
    if (editor === 'new') { createId.current ??= repository.newId(); await repository.create(value, createId.current) }
    else if (editor) await repository.update(editor.id, value)
    closeEditor(); setNotice('Aufgabe gespeichert.'); await reload()
  }
  async function mutate(action: () => Promise<void>, message: string) {
    if (lock.current) return
    lock.current = true; setPending(true); setMutationError(''); setNotice('')
    try { await action(); setDeleting(null); setNotice(message); await reload(); focusHeading() }
    catch (cause) { setMutationError(taskErrorMessage(cause)) }
    finally { lock.current = false; setPending(false) }
  }
  function changeStatus(task: Task, status: TaskStatus) { if (repository) void mutate(() => repository.setStatus(task.id, status), 'Status gespeichert.') }
  const disabled = pending || loading || !!error
  const addDisabled = !repository || disabled || editor !== null
  const title = editor ? editor === 'new' ? 'Aufgabe erstellen' : 'Aufgabe bearbeiten' : { dashboard: 'Deine Übersicht', tasks: 'Meine Aufgaben', calendar: 'Kalender', profile: 'Benutzerprofil' }[view]
  const list = (items: Task[]) => <TaskList tasks={items} disabled={disabled} onEdit={begin} onDelete={task => { setMutationError(''); setDeleting(task); setNotice('') }} onStatus={changeStatus} />
  const status = <>{loading && <p role="status"><span className="spinner" aria-hidden="true" /> Aufgaben werden geladen …</p>}
    {error && <div className="notice error" role="alert"><p>{error}</p><button className="secondary-button" disabled={loading} onClick={() => void reload()}>Erneut versuchen</button></div>}
    {logoutError && <p className="notice error" role="alert">{logoutError}</p>}
    {notice && <p className="notice success" role="status">{notice}</p>}
    {pending && <p role="status">Änderung wird gespeichert. Bitte lasse diese Seite geöffnet.</p>}
    {mutationError && !deleting && <p className="notice error" role="alert">{mutationError}</p>}</>
  const deletion = deleting && <DeleteTaskDialog task={deleting} pending={pending} error={mutationError} onCancel={() => { setDeleting(null); setMutationError(''); focusHeading() }} onConfirm={() => { if (repository) void mutate(() => repository.remove(deleting.id), 'Aufgabe gelöscht.') }} />
  const body = <div ref={content} className="workspace-content">
    {!identity && <div className="tasks-heading"><h1 data-page-heading tabIndex={-1}>{title}</h1><button className="primary-button" disabled={addDisabled} onClick={() => begin('new')}>Aufgabe hinzufügen</button></div>}
    {view === 'profile' ? <ProfileView identity={identity ?? { displayName: null, email: null }} tasks={tasks} loading={loading} error={error} onReload={() => void reload()} onLogout={onLogout} loggingOut={loggingOut} logoutError={logoutError} />
    : view === 'calendar' ? <>{status}{deletion}<CalendarView tasks={tasks} loading={loading} error={error} value={calendar} onChange={setCalendar} renderTasks={list} /></>
    : editor ? <><button className="back-link" onClick={closeEditor}><Icon name="back" />Zurück zu Aufgaben</button><TaskForm key={editor === 'new' ? 'new' : editor.id} initial={editor === 'new' ? undefined : editor} onSave={save} onCancel={closeEditor} /></>
    : view === 'dashboard' ? <>{status}{deletion}<DashboardView tasks={tasks} loading={loading} error={error} identity={identity} renderTasks={list} onAdd={() => begin('new')} addDisabled={addDisabled} /></>
    : <>
      {status}
      {!loading && !error && !deleting && <ProgressCard tasks={tasks} />}
      {deletion}{deleting && <h2 id="tasks-title" className="list-title">Deine Einträge · unverändert</h2>}
      {view === 'tasks' && !deleting && <label className="mobile-search"><Icon name="searchMobile" /><span className="sr-only">Aufgaben suchen</span><input type="search" placeholder="Aufgaben suchen …" value={search} onChange={event => setSearch(event.target.value)} /></label>}
      <section className="task-results" aria-labelledby="tasks-title">
        {!deleting && <div className="task-list-heading"><h2 id="tasks-title" data-page-heading tabIndex={-1}>Aufgaben</h2><div className="status-filters" role="group" aria-label="Aufgaben nach Status filtern">{(['all', ...taskStatuses] as const).map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === 'all' ? 'Alle' : statusLabels[value]}</button>)}</div></div>}
        {!loading && !error && filtered.length === 0 && <div className="task-empty"><h3>{tasks.length ? 'Keine passenden Aufgaben' : 'Noch keine Aufgaben'}</h3><p>{tasks.length ? 'Ändere deine Suche oder den Statusfilter.' : 'Erstelle deine erste Aufgabe und plane deinen nächsten Lernschritt.'}</p>{!tasks.length && <button className="secondary-button" onClick={() => begin('new')}>Erste Aufgabe erstellen</button>}</div>}
        {!loading && !error && list(filtered.slice(0, visible))}
        {view === 'tasks' && !loading && !error && filtered.length > visible && <button className="secondary-button load-more" onClick={() => setVisible(value => value + 50)}>Weitere Aufgaben anzeigen</button>}
      </section>
    </>}
  </div>
  const page = <Suspense fallback={<p role="status">Ansicht wird geladen …</p>}>{body}</Suspense>
  return identity ? <AppLayout view={view} title={title} identity={identity} openCount={!loading && !error ? progress.open : undefined} onAdd={() => begin('new')} addDisabled={addDisabled} search={search} onSearch={setSearch} onLogout={onLogout} loggingOut={loggingOut}>{page}</AppLayout> : page
}
