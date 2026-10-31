// Component test fixture only. Not imported by the production entrypoint.
import React from 'react'
import { createRoot } from 'react-dom/client'
import { TaskWorkspace } from '../../src/tasks/TaskWorkspace'
import type { Task } from '../../src/tasks/model'
import type { TaskRepository } from '../../src/tasks/repository'
import '../../src/styles.css'
let tasks: Task[] = []
let fail = false
const wait = () => new Promise<void>(resolve => setTimeout(resolve, 250))
const repository: TaskRepository = {
  async list() { await wait(); return { tasks: [...tasks], cursor: null, hasMore: false } },
  newId: () => crypto.randomUUID(),
  async create(value, id) { await wait(); if (fail) throw { code: 'unavailable' }; tasks.push({ ...value, id }) },
  async update(id, value) { await wait(); if (fail) throw { code: 'unavailable' }; tasks = tasks.map(task => task.id === id ? { ...value, id } : task) },
  async setStatus(id, status) { await wait(); if (fail) throw { code: 'permission-denied' }; tasks = tasks.map(task => task.id === id ? { ...task, status } : task) },
  async remove(id) { await wait(); if (fail) throw { code: 'unavailable' }; tasks = tasks.filter(task => task.id !== id) },
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><main className="dashboard-content"><button onClick={() => { fail = !fail }}>Testfehler umschalten</button><TaskWorkspace repository={repository} /></main></React.StrictMode>)
