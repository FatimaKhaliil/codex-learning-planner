// Explicit isolated repository fixture, never imported by the application.
import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { TaskWorkspace } from '../../src/tasks/TaskWorkspace'
import type { AppView } from '../../src/layout/AppLayout'
import type { Task } from '../../src/tasks/model'
import type { TaskRepository } from '../../src/tasks/repository'
import '../../src/styles.css'
import '../../src/planner.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
let tasks: Task[] = [
  { id: 'oct-open', title: 'Integrale üben', dueDate: '2026-10-12', subject: 'Mathematik', description: '', status: 'open' },
  { id: 'oct-progress', title: 'Essay ausarbeiten', dueDate: '2026-10-14', subject: 'Deutsch', description: '', status: 'in-progress' },
  { id: 'oct-done', title: 'Zellen wiederholen', dueDate: '2026-10-09', subject: 'Biologie', description: '', status: 'done' },
  ...Array.from({ length: 50 }, (_, i): Task => ({ id: `jan-${i}`, title: `Januar-Aufgabe ${i}`, dueDate: '2027-01-31', subject: '', description: '', status: 'open' })),
  { id: 'after-page', title: 'Aufgabe nach Cursorseite eins', dueDate: '2026-10-12', subject: '', description: '', status: 'done' },
]
let fail = false
let delay = 80
const audit = { reads: 0, writes: 0 }
Object.assign(window, { calendarTestAudit: audit })
const repository: TaskRepository = {
  async list(cursor) { audit.reads++; await new Promise(resolve => setTimeout(resolve, delay)); if (fail) throw { code: 'unavailable' }; const start = cursor ? Number(cursor.id) : 0; return { tasks: tasks.slice(start, start + 50), cursor: { id: String(start + 50) } as never, hasMore: tasks.length > start + 50 } },
  newId: () => crypto.randomUUID(),
  async create(value, id) { audit.writes++; tasks.push({ ...value, id }) },
  async update(id, value) { audit.writes++; tasks = tasks.map(task => task.id === id ? { ...value, id } : task) },
  async setStatus(id, status) { audit.writes++; tasks = tasks.map(task => task.id === id ? { ...task, status } : task) },
  async remove(id) { audit.writes++; tasks = tasks.filter(task => task.id !== id) },
}
function Fixture() {
  const [view, setView] = useState<AppView>('calendar')
  const [version, setVersion] = useState(0)
  useEffect(() => { const change = () => { const key = location.hash.slice(2); setView(key === 'tasks' || key === 'dashboard' || key === 'profile' ? key : 'calendar') }; change(); window.addEventListener('hashchange',change); return () => window.removeEventListener('hashchange',change) }, [])
  return <><div id="fixture-controls"><button onClick={() => { tasks = tasks.filter(task => task.id !== 'after-page'); setVersion(v => v + 1) }}>Visueller Dreierbestand</button><button onClick={() => { fail = true; setVersion(v => v + 1) }}>Ladefehler</button><button onClick={() => { fail = false; delay = 1000; setVersion(v => v + 1) }}>Langsam laden</button><button onClick={() => { tasks = []; setVersion(v => v + 1) }}>Leerer Bestand</button></div><TaskWorkspace key={version} repository={repository} view={view} identity={{ displayName: null, email: 'calendar-test@example.test' }} /></>
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Fixture /></React.StrictMode>)
