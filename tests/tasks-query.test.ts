import assert from 'node:assert/strict'
import test from 'node:test'
import { filterTasks, loadAllTasks, taskProgress } from '../src/tasks/queries.ts'
import type { Task } from '../src/tasks/model.ts'
import type { TaskRepository } from '../src/tasks/repository.ts'
const tasks: Task[] = Array.from({ length: 123 }, (_, i) => ({ id: String(i), title: i === 121 ? 'Äquivalenz prüfen' : `Aufgabe ${i}`, dueDate: '2026-11-01', description: i === 122 ? 'Zweite Seite' : '', subject: i === 120 ? 'Biologie' : '', status: i % 3 === 0 ? 'done' : i % 3 === 1 ? 'open' : 'in-progress' }))
function repository(list: TaskRepository['list']) { return { list } as TaskRepository }
test('loads every cursor page before publishing the complete collection', async () => {
  let calls = 0
  const result = await loadAllTasks(repository(async cursor => {
    calls++; const offset = cursor ? Number(cursor.id) : 0
    const end = Math.min(offset + 50, tasks.length)
    return { tasks: tasks.slice(offset, end), cursor: { id: String(end) } as never, hasMore: end < tasks.length }
  }))
  assert.equal(calls, 3); assert.equal(result.length, 123)
  assert.equal(taskProgress(result).total, 123)
  assert.equal(filterTasks(result, 'ÄQUIVALENZ', 'all')[0].id, '121')
  assert.equal(filterTasks(result, 'Biologie', 'all')[0].id, '120')
  assert.equal(filterTasks(result, 'Zweite Seite', 'all')[0].id, '122')
})
test('status filters combine with search and do not alter global progress', () => {
  for (const status of ['open', 'in-progress', 'done'] as const) assert.equal(filterTasks(tasks, '', status).length, 41)
  assert.equal(filterTasks(tasks, '  äquivalenz  ', 'open').length, 1)
  assert.equal(filterTasks(tasks, 'äquivalenz', 'done').length, 0)
  const progress = taskProgress(tasks)
  assert.equal(progress.total, 123); assert.equal(progress.done, 41); assert.equal(progress.open, 82)
  assert.ok(Math.abs(progress.percent - 100 / 3) < 1e-10)
  assert.deepEqual(taskProgress([]), { total: 0, done: 0, open: 0, percent: 0 })
})
test('page errors fail the collection load instead of exposing incomplete totals', async () => {
  let calls = 0
  await assert.rejects(loadAllTasks(repository(async () => { if (++calls === 2) throw new Error('offline'); return { tasks: tasks.slice(0, 50), cursor: { id: '50' } as never, hasMore: true } })), /offline/)
})
test('repeated cursors are rejected; cancelled loads stop requesting pages', async () => {
  await assert.rejects(loadAllTasks(repository(async () => ({ tasks: tasks.slice(0, 1), cursor: { id: 'same' } as never, hasMore: true }))), /invalid-pagination/)
  let calls = 0
  assert.deepEqual(await loadAllTasks(repository(async () => { calls++; return { tasks: [], cursor: null, hasMore: false } }), () => false), [])
  assert.equal(calls, 0)
})
