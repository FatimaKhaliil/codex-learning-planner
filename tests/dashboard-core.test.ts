import assert from 'node:assert/strict'
import test from 'node:test'
import { dashboardMetrics, upcomingTasks } from '../src/dashboard/model.ts'
import type { Task } from '../src/tasks/model.ts'

function task(id: string, dueDate = '2026-11-03', status: Task['status'] = 'open'): Task {
  return { id, dueDate, status, title: `Lernschritt ${id}`, description: '', subject: '' }
}

test('dashboard metrics distinguish status distribution and progress for empty/all-done collections', () => {
  assert.deepEqual(dashboardMetrics([]), { total: 0, open: 0, inProgress: 0, done: 0, incomplete: 0, percent: 0 })
  const mixed = dashboardMetrics([task('a'), task('b', undefined, 'in-progress'), task('c', undefined, 'done')])
  assert.deepEqual({ ...mixed, percent: 0 }, { total: 3, open: 1, inProgress: 1, done: 1, incomplete: 2, percent: 0 })
  assert.ok(Math.abs(mixed.percent - 100 / 3) < 1e-10)
  assert.deepEqual(dashboardMetrics([task('complete', undefined, 'done')]), { total: 1, open: 0, inProgress: 0, done: 1, incomplete: 0, percent: 100 })
  assert.deepEqual(upcomingTasks([]), [])
  assert.deepEqual(upcomingTasks([task('complete', undefined, 'done')]), [])
})

test('dashboard calculations include all 54 tasks including records after the first cursor page', () => {
  const tasks = Array.from({ length: 54 }, (_, index) => task(String(index), index === 53 ? '2020-01-01' : '2026-11-03', index % 3 === 0 ? 'done' : index % 3 === 1 ? 'open' : 'in-progress'))
  const metrics = dashboardMetrics(tasks)
  assert.deepEqual({ ...metrics, percent: 0 }, { total: 54, open: 18, inProgress: 18, done: 18, incomplete: 36, percent: 0 })
  assert.ok(Math.abs(metrics.percent - 100 / 3) < 1e-10)
  assert.equal(upcomingTasks(tasks)[0].id, '53')
  assert.equal(upcomingTasks(tasks, 100).length, 36)
})

test('dashboard calculations remain complete for 1000 synthetic tasks', () => {
  const tasks = Array.from({ length: 1000 }, (_, index) => task(`task-${String(index).padStart(4, '0')}`, index === 998 ? '2020-01-01' : '2026-11-03', index % 3 === 0 ? 'done' : index % 3 === 1 ? 'open' : 'in-progress'))
  assert.deepEqual(dashboardMetrics(tasks), { total: 1000, open: 333, inProgress: 333, done: 334, incomplete: 666, percent: 33.4 })
  assert.deepEqual(upcomingTasks(tasks).map(value => value.id), ['task-0998', 'task-0001', 'task-0002'])
  assert.equal(upcomingTasks(tasks, 1000).length, 666)
})

test('upcoming tasks sort dates, retain overdue tasks, exclude completed tasks and use locale-independent ID ties', () => {
  const tasks = [task('z', '2026-11-04'), task('ä', '2026-11-03'), task('a', '2026-11-03'), task('A', '2026-11-03'), task('overdue', '2020-01-01'), task('done', '2019-01-01', 'done')]
  assert.deepEqual(upcomingTasks(tasks, 20).map(value => value.id), ['overdue', 'A', 'a', 'ä', 'z'])
  assert.deepEqual(upcomingTasks(tasks).map(value => value.id), ['overdue', 'A', 'a'])
  assert.deepEqual(upcomingTasks(tasks, 0), [])
})

test('missing/invalid due dates follow valid dates and are ordered by ID without mutating frozen input', () => {
  const tasks = [task('missing', ''), task('invalid', '2026-02-30'), task('valid', '9999-12-31'), task('format', '03.11.2026'), task('leap', '2024-02-29')]
  const before = JSON.stringify(tasks)
  tasks.forEach(Object.freeze)
  Object.freeze(tasks)
  assert.deepEqual(upcomingTasks(tasks, 10).map(value => value.id), ['leap', 'valid', 'format', 'invalid', 'missing'])
  assert.equal(JSON.stringify(tasks), before)
  assert.equal(upcomingTasks(tasks, 10)[0], tasks[4])
})

test('invalid upcoming limits fail explicitly rather than hiding data unpredictably', () => {
  for (const limit of [-1, 1.5, NaN, Infinity]) assert.throws(() => upcomingTasks([], limit), RangeError)
})
