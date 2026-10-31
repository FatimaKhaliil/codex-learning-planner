import assert from 'node:assert/strict'
import test from 'node:test'
import { emptyTask, normalizeTask, taskErrorMessage, taskStatuses, validateTask, validDate } from '../src/tasks/model.ts'
const task = { ...emptyTask, title: '  Ableitungen üben  ', dueDate: '2026-11-01' }
test('required fields, default status and optional values', () => {
  assert.equal(emptyTask.status, 'open')
  assert.deepEqual(validateTask(task), {})
  assert.ok(validateTask({ ...task, title: '   ' }).title)
  assert.ok(validateTask({ ...task, dueDate: '' }).dueDate)
  assert.equal(normalizeTask(task).title, 'Ableitungen üben')
  assert.equal(normalizeTask(task).description, '')
})
test('calendar dates are timezone independent, leap years and impossible dates rejected', () => {
  for (const date of ['2024-02-29', '2026-12-31', '2000-02-29']) assert.ok(validDate(date))
  for (const date of ['2026-02-29', '2026-04-31', '2026-13-01', '2026-00-01', '01.11.2026', '2026-1-1', '0000-01-01']) assert.equal(validDate(date), false, date)
})
test('all statuses are valid and unknown statuses rejected', () => {
  for (const status of taskStatuses) assert.deepEqual(validateTask({ ...task, status }), {})
  assert.throws(() => normalizeTask({ ...task, status: 'unknown' as typeof task.status }))
})
test('field size limits protect Firestore writes; optional fields are trimmed', () => {
  assert.deepEqual(validateTask({ ...task, title: 't'.repeat(200), subject: 's'.repeat(100), description: 'd'.repeat(5000) }), {})
  assert.ok(validateTask({ ...task, title: 't'.repeat(201) }).title)
  assert.ok(validateTask({ ...task, subject: 's'.repeat(101) }).subject)
  assert.ok(validateTask({ ...task, description: 'd'.repeat(5001) }).description)
  assert.equal(normalizeTask({ ...task, subject: ' Mathe ', description: ' Notiz ' }).subject, 'Mathe')
})
test('safe actionable Firestore errors do not expose backend details', () => {
  assert.match(taskErrorMessage({ code: 'permission-denied' }), /Anmeldung/)
  assert.match(taskErrorMessage({ code: 'unavailable' }), /Internetverbindung/)
  assert.match(taskErrorMessage({ code: 'not-found' }), /gelöscht/)
  assert.equal(taskErrorMessage(new Error('secret')), taskErrorMessage(null))
})
