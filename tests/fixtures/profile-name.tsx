// Explicitly isolated repository/identity. Never imported by the product entry.
// Real SDK persistence and access protection are tested separately with Auth Emulator.
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

const task: Task = { id: 'isolated-one', title: 'Isolierter Lernschritt', dueDate: '2026-10-12', description: '', subject: 'Mathematik', status: 'open' }
const audit = { taskReads: 0, saveAttempts: 0, successfulSaves: 0, taskWrites: 0 }
Object.assign(window, { profileNameTestAudit: audit })
let fail = false
let responseGate: Promise<void> | null = null
let releaseResponse: (() => void) | null = null
const repository: TaskRepository = {
  async list() { audit.taskReads++; await new Promise(resolve => setTimeout(resolve, 40)); return { tasks: [task], cursor: null, hasMore: false } },
  newId: () => 'unused-isolated-id',
  async create() { audit.taskWrites++; throw new Error('not-used-in-profile-name-test') },
  async update() { audit.taskWrites++; throw new Error('not-used-in-profile-name-test') },
  async setStatus() { audit.taskWrites++; throw new Error('not-used-in-profile-name-test') },
  async remove() { audit.taskWrites++; throw new Error('not-used-in-profile-name-test') },
}

function Fixture() {
  const [view, setView] = useState<AppView>('profile')
  const [identity, setIdentity] = useState<AppIdentity>({ displayName: null, email: 'name-ui@example.test' })
  const [savingDisplayName, setSavingDisplayName] = useState(false)
  useEffect(() => {
    const change = () => { const key = location.hash.slice(2); setView(key === 'dashboard' || key === 'tasks' || key === 'calendar' ? key : 'profile') }
    change(); window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [])
  async function saveDisplayName(name: string) {
    audit.saveAttempts++
    setSavingDisplayName(true)
    const gate = responseGate
    try {
      await new Promise(resolve => setTimeout(resolve, 800))
      if (gate) await gate
      if (fail) throw Object.assign(new Error('isolated-network-error'), { code: 'auth/network-request-failed' })
      audit.successfulSaves++
      setIdentity(current => ({ ...current, displayName: name }))
    } finally { setSavingDisplayName(false) }
  }
  return <><div id="fixture-controls"><button onClick={() => { fail = true }}>Speicherfehler aktivieren</button><button onClick={() => { fail = false }}>Speicherfehler beheben</button>
    <button onClick={() => { responseGate = new Promise<void>(resolve => { releaseResponse = resolve }) }}>Speicherrückmeldung anhalten</button>
    <button onClick={() => { releaseResponse?.(); releaseResponse = null; responseGate = null }}>Speicherrückmeldung freigeben</button></div>
    <TaskWorkspace repository={repository} view={view} identity={identity} onSaveDisplayName={saveDisplayName} savingDisplayName={savingDisplayName} />
  </>
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><Fixture /></React.StrictMode>)
