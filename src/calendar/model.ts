import type { Task } from '../tasks/model.ts'

export interface CalendarMonth { year: number; month: number }
export interface CalendarDay { date: string; day: number; inMonth: boolean }
interface CalendarDate extends CalendarMonth { day: number }

export const monthNames = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
] as const

const MIN_YEAR = 1000
const MAX_YEAR = 9999

function checkMonth(value: CalendarMonth): void {
  if (!Number.isInteger(value.year) || value.year < MIN_YEAR || value.year > MAX_YEAR ||
      !Number.isInteger(value.month) || value.month < 1 || value.month > 12) {
    throw new RangeError('invalid-calendar-month')
  }
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

function dateKey(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function monthKey(value: CalendarMonth): string {
  checkMonth(value)
  return `${value.year}-${String(value.month).padStart(2, '0')}`
}

export function parseDateKey(value: string): CalendarDate | null {
  if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null
  return { year, month, day }
}

// Only a real "today" value is read from Date. Stored dueDate strings are never
// parsed as instants or converted through UTC when building/grouping the calendar.
export function localDateKey(value: Date): string {
  const year = value.getFullYear()
  const month = value.getMonth() + 1
  checkMonth({ year, month })
  return dateKey(year, month, value.getDate())
}

export function moveMonth(value: CalendarMonth, delta: number): CalendarMonth {
  checkMonth(value)
  if (!Number.isSafeInteger(delta)) throw new RangeError('invalid-month-offset')
  const absolute = value.year * 12 + value.month - 1 + delta
  const result = { year: Math.floor(absolute / 12), month: absolute % 12 + 1 }
  checkMonth(result)
  return result
}

export function monthGrid(value: CalendarMonth): CalendarDay[] {
  checkMonth(value)
  // Gregorian weekday arithmetic (Sakamoto), Sunday=0. No host timezone/DST or
  // Date constructor is involved, including for years with historical offsets.
  const offsets = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4]
  const year = value.year - (value.month < 3 ? 1 : 0)
  const sundayIndex = (year + Math.floor(year / 4) - Math.floor(year / 100) +
    Math.floor(year / 400) + offsets[value.month - 1] + 1) % 7
  const leadingDays = (sundayIndex + 6) % 7
  const days = daysInMonth(value.year, value.month)
  const cells = Math.ceil((leadingDays + days) / 7) * 7

  return Array.from({ length: cells }, (_, index) => {
    let day = index - leadingDays + 1
    let month = value.month
    let cellYear = value.year
    const inMonth = day >= 1 && day <= days
    if (day < 1) {
      if (--month === 0) { month = 12; cellYear-- }
      day += daysInMonth(cellYear, month)
    } else if (day > days) {
      day -= days
      if (++month === 13) { month = 1; cellYear++ }
    }
    // Sentinel cells beyond the supported task date range remain displayable as
    // adjacent-day labels, but cannot be selected or queried by a task date key.
    const date = cellYear < MIN_YEAR || cellYear > MAX_YEAR ? '' : dateKey(cellYear, month, day)
    return { date, day, inMonth }
  })
}

export function tasksOnDate(tasks: readonly Task[], date: string): Task[] {
  if (!parseDateKey(date)) return []
  return tasks.filter(task => task.dueDate === date)
}

export function tasksInMonth(tasks: readonly Task[], month: CalendarMonth): Task[] {
  const prefix = `${monthKey(month)}-`
  return tasks.filter(task => task.dueDate.startsWith(prefix) && parseDateKey(task.dueDate) !== null)
}

export function indexTasksByDate(tasks: readonly Task[]): Map<string, Task[]> {
  const groups = new Map<string, Task[]>()
  for (const task of tasks) {
    if (!parseDateKey(task.dueDate)) continue
    const group = groups.get(task.dueDate)
    if (group) group.push(task)
    else groups.set(task.dueDate, [task])
  }
  return groups
}
