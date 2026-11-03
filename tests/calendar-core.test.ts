import assert from 'node:assert/strict'
import test from 'node:test'
import {
  indexTasksByDate, localDateKey, monthGrid, monthKey, monthNames,
  moveMonth, parseDateKey, tasksInMonth, tasksOnDate,
} from '../src/calendar/model.ts'
import type { Task } from '../src/tasks/model.ts'

function task(id: string, dueDate: string): Task {
  return { id, dueDate, title: `Lernschritt ${id}`, subject: '', description: '', status: 'open' }
}

test('Monday-first grid includes adjacent dates and complete weeks for Figma October 2026', () => {
  const grid = monthGrid({ year: 2026, month: 10 })
  assert.equal(grid.length, 35)
  assert.deepEqual(grid[0], { date: '2026-09-28', day: 28, inMonth: false })
  assert.deepEqual(grid[3], { date: '2026-10-01', day: 1, inMonth: true })
  assert.deepEqual(grid.at(-1), { date: '2026-11-01', day: 1, inMonth: false })
  assert.equal(grid.filter(day => day.inMonth).length, 31)
  assert.equal(new Set(grid.map(day => day.date)).size, 35)
})

test('28/35/42-cell grids and Gregorian leap years are calculated correctly', () => {
  assert.equal(monthGrid({ year: 2021, month: 2 }).length, 28)
  assert.equal(monthGrid({ year: 2026, month: 2 }).length, 35)
  assert.equal(monthGrid({ year: 2026, month: 8 }).length, 42)
  for (const [year, expected] of [[1900, 28], [2000, 29], [2024, 29], [2100, 28]]) {
    assert.equal(monthGrid({ year, month: 2 }).filter(day => day.inMonth).length, expected)
  }
})

test('month navigation crosses year boundaries without modifying its input', () => {
  const december = Object.freeze({ year: 2026, month: 12 })
  assert.deepEqual(moveMonth(december, 1), { year: 2027, month: 1 })
  assert.deepEqual(moveMonth({ year: 2026, month: 1 }, -1), { year: 2025, month: 12 })
  assert.deepEqual(moveMonth(december, -24), { year: 2024, month: 12 })
  assert.deepEqual(moveMonth(december, 0), december)
  assert.equal(monthKey(december), '2026-12')
  assert.deepEqual(monthNames.slice(0, 3), ['Januar', 'Februar', 'März'])
})

test('date keys validate strict calendar dates without interpreting timezone instants', () => {
  assert.deepEqual(parseDateKey('2024-02-29'), { year: 2024, month: 2, day: 29 })
  assert.deepEqual(parseDateKey('2000-02-29'), { year: 2000, month: 2, day: 29 })
  for (const date of ['1900-02-29', '2100-02-29', '2026-04-31', '2026-00-10', '2026-13-01',
    '2026-01-00', '2026-01-32', '2026-1-01', '0999-12-31', '10000-01-01',
    '2026-10-01T00:00:00Z', '01.10.2026', ' 2026-10-01', '']) assert.equal(parseDateKey(date), null, date)
  assert.equal(localDateKey(new Date(2026, 0, 2, 0, 15)), '2026-01-02')
  assert.throws(() => localDateKey(new Date(NaN)), RangeError)
})

test('invalid months/offsets fail explicitly and year-edge padding cannot produce selectable invalid task dates', () => {
  for (const month of [{ year: 999, month: 1 }, { year: 10000, month: 1 }, { year: 2026, month: 0 },
    { year: 2026, month: 13 }, { year: 2026.5, month: 2 }, { year: 2026, month: NaN }]) {
    assert.throws(() => monthGrid(month), RangeError)
    assert.throws(() => monthKey(month), RangeError)
  }
  assert.throws(() => moveMonth({ year: 1000, month: 1 }, -1), RangeError)
  assert.throws(() => moveMonth({ year: 9999, month: 12 }, 1), RangeError)
  assert.throws(() => moveMonth({ year: 2026, month: 1 }, 0.5), RangeError)
  assert.throws(() => moveMonth({ year: 2026, month: 1 }, Infinity), RangeError)
  for (const month of [{ year: 1000, month: 1 }, { year: 9999, month: 12 }]) {
    const grid = monthGrid(month)
    assert.equal(grid.length % 7, 0)
    assert.ok(grid.every(day => day.date === '' ? !day.inMonth : parseDateKey(day.date) !== null))
    assert.ok(grid.some(day => day.date === ''))
  }
})

test('day/month selection and indexing include tasks beyond the first 50 without mutating records', () => {
  const tasks = Array.from({ length: 123 }, (_, index) => task(String(index), index < 51 ? '2026-09-30' : '2026-10-09'))
  tasks.push(task('next-year', '2027-01-01'), task('invalid-date', '2026-10-32'))
  const before = JSON.stringify(tasks)
  tasks.forEach(Object.freeze)
  Object.freeze(tasks)
  const october = tasksInMonth(tasks, { year: 2026, month: 10 })
  const day = tasksOnDate(tasks, '2026-10-09')
  const groups = indexTasksByDate(tasks)
  assert.equal(october.length, 72)
  assert.equal(day.length, 72)
  assert.equal(october.at(-1)?.id, '122')
  assert.equal(groups.get('2026-10-09')?.length, 72)
  assert.equal(groups.get('2026-09-30')?.length, 51)
  assert.equal(groups.has('2026-10-32'), false)
  assert.equal(tasksInMonth(tasks, { year: 2027, month: 1 })[0].id, 'next-year')
  assert.deepEqual(tasksOnDate(tasks, ''), [])
  assert.deepEqual(tasksOnDate(tasks, '2026-02-29'), [])
  assert.equal(JSON.stringify(tasks), before)
  assert.equal(day[0], tasks[51])
  assert.notEqual(day, groups.get('2026-10-09'))
})

test('calendar keys and dueDate grouping remain correct in UTC+14 and UTC-8', () => {
  // Synchronous test, restoring TZ before returning; no child processes required.
  const previous = process.env.TZ
  try {
    for (const [timezone, offset] of [['Pacific/Kiritimati', -840], ['America/Los_Angeles', 480], ['Europe/Berlin', -60]] as const) {
      process.env.TZ = timezone
      const local = new Date(2026, 0, 2, 0, 15)
      assert.equal(local.getTimezoneOffset(), offset, timezone)
      assert.equal(localDateKey(local), '2026-01-02', timezone)
      assert.deepEqual(tasksOnDate([task('late', '2026-01-02')], '2026-01-02').map(value => value.id), ['late'], timezone)
      assert.equal(monthGrid({ year: 2026, month: 1 })[0].date, '2025-12-29', timezone)
      assert.ok(monthGrid({ year: 2024, month: 2 }).some(day => day.date === '2024-02-29'), timezone)
    }
  } finally {
    if (previous === undefined) delete process.env.TZ
    else process.env.TZ = previous
  }
})
