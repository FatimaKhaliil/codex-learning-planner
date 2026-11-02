// Isolated component fixture. No production entry imports this module.
// Synthetic test records are NOT claimed to be real Firestore integration data.
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
  { id: crypto.randomUUID(), title: 'Integrale üben', dueDate: '2026-11-02', subject: 'Mathematik', description: 'Übungsblatt bearbeiten.', status: 'open' },
  { id: crypto.randomUUID(), title: 'Essay ausarbeiten', dueDate: '2026-11-04', subject: 'Deutsch', description: '', status: 'in-progress' },
  { id: crypto.randomUUID(), title: 'Zellen wiederholen', dueDate: '2026-10-30', subject: 'Biologie', description: '', status: 'done' },
]
let fail = false
const wait = () => new Promise<void>(resolve => setTimeout(resolve, 80))
const repository: TaskRepository = {
  async list(cursor) { await wait(); if (fail) throw { code: 'unavailable' }; const offset = cursor ? Number(cursor.id) : 0; return { tasks: tasks.slice(offset, offset + 50), cursor: { id: String(offset + 50) } as never, hasMore: tasks.length > offset + 50 } },
  newId: () => crypto.randomUUID(),
  async create(value, id) { await wait(); if (fail) throw { code: 'unavailable' }; tasks.push({ ...value, id }) },
  async update(id, value) { await wait(); if (fail) throw { code: 'unavailable' }; tasks = tasks.map(task => task.id === id ? { ...value, id } : task) },
  async setStatus(id, status) { await wait(); if (fail) throw { code: 'permission-denied' }; tasks = tasks.map(task => task.id === id ? { ...task, status } : task) },
  async remove(id) { await wait(); if (fail) throw { code: 'unavailable' }; tasks = tasks.filter(task => task.id !== id) },
}
function Fixture() {
  const [view, setView] = useState<AppView>('tasks')
  const [version, setVersion] = useState(0)
  useEffect(() => { const change = () => { const route = location.hash.slice(2); setView(route === 'dashboard' || route === 'calendar' || route === 'profile' ? route : 'tasks') }; change(); window.addEventListener('hashchange', change); return () => window.removeEventListener('hashchange', change) }, [])
  return <><div id="fixture-controls"><button onClick={() => { tasks = [...tasks, ...Array.from({ length: 51 }, (_, i): Task => ({ id: crypto.randomUUID(), title: i === 50 ? 'Späte Suchnadel' : `Zusatz ${i}`, dueDate: '2026-12-01', description: '', subject: '', status: 'open' }))]; setVersion(value => value + 1) }}>Mehr als 50 Testdatensätze</button><button onClick={() => { fail = !fail }}>Testfehler umschalten</button></div><TaskWorkspace key={version} repository={repository} view={view} identity={{ displayName: null, email: 'ui-test@example.test' }} /></>
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Fixture /></React.StrictMode>)
