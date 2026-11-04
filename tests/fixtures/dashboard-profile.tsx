// Isolated synthetic data for regression/visual comparison; never a production entry.
import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { TaskWorkspace } from '../../src/tasks/TaskWorkspace'
import type { AppIdentity, AppView } from '../../src/layout/AppLayout'
import type { Task } from '../../src/tasks/model'
import type { TaskRepository } from '../../src/tasks/repository'
import '../../src/styles.css'
import '../../src/planner.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'

const visualTasks: Task[] = [
  { id: 'open', title: 'Mathematik: Integrale verstehen', dueDate: '2026-10-12', subject: 'Mathematik', description: '', status: 'open' },
  { id: 'progress', title: 'Deutsch: Essay ausarbeiten', dueDate: '2026-10-14', subject: 'Deutsch', description: '', status: 'in-progress' },
  { id: 'done', title: 'Biologie: Zellen wiederholen', dueDate: '2026-10-09', subject: 'Biologie', description: '', status: 'done' },
]
let tasks = visualTasks.map(task => ({ ...task }))
let fail = false
let delay = 40
const audit = { reads: 0, writes: 0 }
Object.assign(window, { dashboardTestAudit: audit })
const repository: TaskRepository = {
  async list(cursor) {
    audit.reads++
    await new Promise(resolve => setTimeout(resolve, delay))
    if (fail) throw { code: 'unavailable' }
    const start = cursor ? Number(cursor.id) : 0
    const page = tasks.slice(start, start + 50)
    return { tasks: page, cursor: { id: String(start + 50) } as never, hasMore: page.length === 50 }
  },
  newId: () => crypto.randomUUID(),
  async create(value, id) { audit.writes++; tasks.push({ ...value, id }) },
  async update(id, value) { audit.writes++; tasks = tasks.map(task => task.id === id ? { ...value, id } : task) },
  async setStatus(id, status) { audit.writes++; tasks = tasks.map(task => task.id === id ? { ...task, status } : task) },
  async remove(id) { audit.writes++; tasks = tasks.filter(task => task.id !== id) },
}
function synthetic(count: number): Task[] {
  return Array.from({ length: count }, (_, i) => ({ id: String(i).padStart(4, '0'), title: `Synthetische Aufgabe ${i}`, dueDate: i >= count - 3 ? '2026-09-30' : '2026-12-01', subject: '', description: '', status: (['open', 'in-progress', 'done'] as const)[i % 3] }))
}
function Fixture() {
  const [view, setView] = useState<AppView>('dashboard')
  const [version, setVersion] = useState(0)
  const [identity, setIdentity] = useState<AppIdentity>({ displayName: 'Mira Sommer', email: 'mira@example.test' })
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  useEffect(() => { const change = () => { const v = location.hash.slice(2); setView(v === 'tasks' || v === 'calendar' || v === 'profile' ? v : 'dashboard') }; change(); window.addEventListener('hashchange', change); return () => window.removeEventListener('hashchange', change) }, [])
  function replace(next: Task[]) { tasks = next; fail = false; delay = 40; setVersion(v => v + 1) }
  return <><div id="fixture-controls">
    <button onClick={() => replace(synthetic(54))}>54 Aufgaben</button>
    <button onClick={() => replace(synthetic(1000))}>1000 Aufgaben</button>
    <button onClick={() => replace([])}>Leerer Bestand</button>
    <button onClick={() => replace(visualTasks.map(task => ({ ...task, status: 'done' })))}>Alles erledigt</button>
    <button onClick={() => { fail = true; setVersion(v => v + 1) }}>Ladefehler</button>
    <button onClick={() => { fail = false; delay = 800; setVersion(v => v + 1) }}>Langsam laden</button>
    <button onClick={() => { fail = false }}>Fehler beheben</button>
    <button onClick={() => { setIdentity({ displayName: null, email: null }); replace([]) }}>Fehlende Identität</button>
    <button onClick={() => { setIdentity({ displayName: 'Benutzerin'.repeat(15), email: 'lang'.repeat(20)+'@example.test' }); replace([]) }}>Lange Identität</button>
    <button onClick={() => { setIdentity({ displayName: 'Zweite Benutzerin', email: 'zweite@example.test' }); replace([{ ...visualTasks[0], id: 'second-user-task', title: 'Nur zweites Konto' }]) }}>Isolierter Kontowechsel</button>
  </div><TaskWorkspace key={version} repository={repository} view={view} identity={identity} onLogout={() => { setLoggingOut(true); setLogoutError(''); setTimeout(() => { setLoggingOut(false); setLogoutError('Die Abmeldung ist fehlgeschlagen. Bitte versuche es erneut.') }, 800) }} loggingOut={loggingOut} logoutError={logoutError} /></>
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Fixture /></React.StrictMode>)
