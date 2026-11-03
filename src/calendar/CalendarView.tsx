import { useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { Icon } from '../layout/Icon'
import type { Task } from '../tasks/model'
import { indexTasksByDate, localDateKey, monthGrid, monthKey, monthNames, moveMonth, parseDateKey, tasksInMonth } from './model'
import type { CalendarMonth } from './model'
import './calendar.css'
export interface CalendarSelection { month: CalendarMonth; selectedDate: string | null }
export function initialCalendarSelection(): CalendarSelection {
  const today = new Date()
  return { month: { year: today.getFullYear(), month: today.getMonth() + 1 }, selectedDate: null }
}
interface Props {
  tasks: readonly Task[]; loading: boolean; error: string; value: CalendarSelection
  onChange: (value: CalendarSelection) => void; renderTasks: (tasks: Task[]) => ReactNode
}
const weekdays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
function dateLabel(key: string): string {
  const date = parseDateKey(key)
  return date ? `${date.day}. ${monthNames[date.month - 1]} ${date.year}` : ''
}
export function CalendarView({ tasks, loading, error, value, onChange, renderTasks }: Props) {
  const { month, selectedDate } = value
  const cells = useMemo(() => monthGrid(month), [month.year, month.month])
  const groups = useMemo(() => indexTasksByDate(tasks), [tasks])
  const monthTasks = useMemo(() => tasksInMonth(tasks, month), [tasks, month.year, month.month])
  const [visible, setVisible] = useState({ key: '', count: 50 })
  const buttons = useRef(new Map<string, HTMLButtonElement>())
  const today = localDateKey(new Date())
  const [focused, setFocused] = useState('')
  const key = `${monthKey(month)}:${selectedDate ?? ''}`
  const count = visible.key === key ? visible.count : 50
  const displayedTasks = selectedDate ? groups.get(selectedDate) ?? [] : monthTasks
  const primaryDate = selectedDate ?? (cells.some(cell => cell.date === today && cell.inMonth) ? today : `${monthKey(month)}-01`)
  const focusable = cells.some(cell => cell.date === focused) ? focused : primaryDate
  const unavailable = loading || !!error
  const canPrevious = month.year > 1000 || month.month > 1
  const canNext = month.year < 9999 || month.month < 12
  function navigate(delta: number, focusDay = false) {
    if (delta < 0 ? !canPrevious : !canNext) return
    const next = moveMonth(month, delta)
    const first = `${monthKey(next)}-01`
    setFocused(first)
    onChange({ month: next, selectedDate: null })
    if (focusDay) requestAnimationFrame(() => buttons.current.get(first)?.focus())
  }
  function choose(date: string) {
    const parsed = parseDateKey(date)
    if (!parsed) return
    setFocused(date)
    onChange({ month: { year: parsed.year, month: parsed.month }, selectedDate: date === selectedDate ? null : date })
    requestAnimationFrame(() => buttons.current.get(date)?.focus())
  }
  function clearSelection() {
    onChange({ month, selectedDate: null })
    if (selectedDate) requestAnimationFrame(() => buttons.current.get(selectedDate)?.focus())
  }
  function keyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault(); navigate(event.key === 'PageUp' ? -1 : 1, true); return
    }
    const delta = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -(index % 7), End: 6 - index % 7 } as Record<string, number>)[event.key]
    if (delta === undefined) return
    event.preventDefault()
    const date = cells[index + delta]?.date
    if (date) { setFocused(date); buttons.current.get(date)?.focus() }
  }
  return <div className="calendar-view">
    <section className="calendar-card" aria-labelledby="calendar-month-title">
      <div className="calendar-month-header"><h2 id="calendar-month-title" data-page-heading tabIndex={-1} aria-live="polite" aria-atomic="true">{monthNames[month.month - 1]} {month.year}</h2>
        <div className="calendar-month-actions"><button className="calendar-month-button" aria-label="Vorheriger Monat" disabled={!canPrevious} onClick={() => navigate(-1)}><Icon name="previousMonth" /></button><button className="calendar-month-button" aria-label="Nächster Monat" disabled={!canNext} onClick={() => navigate(1)}><Icon name="nextMonth" /></button></div>
      </div>
      <table className="calendar-table" aria-labelledby="calendar-month-title"><thead><tr>{weekdays.map(day => <th scope="col" key={day}><abbr title={day}>{day.slice(0, 2)}</abbr></th>)}</tr></thead><tbody>
        {Array.from({ length: cells.length / 7 }, (_, week) => <tr key={week}>{cells.slice(week * 7, week * 7 + 7).map((cell, column) => {
          const taskCount = unavailable ? 0 : groups.get(cell.date)?.length ?? 0
          const selected = selectedDate === cell.date
          return <td key={`${week}-${column}`}><button ref={node => { if (node) buttons.current.set(cell.date, node); else buttons.current.delete(cell.date) }} data-date={cell.date} className={`calendar-day${cell.inMonth ? '' : ' adjacent-month'}${selected ? ' is-selected' : ''}${cell.date === today ? ' is-today' : ''}${!selectedDate && cell.date === today ? ' today-highlight' : ''}`} disabled={!cell.date} tabIndex={cell.date === focusable ? 0 : -1} aria-pressed={selected} aria-current={cell.date === today ? 'date' : undefined} aria-controls="calendar-task-results" aria-label={`${dateLabel(cell.date)}, ${unavailable ? 'Aufgaben noch nicht verfügbar' : `${taskCount} ${taskCount === 1 ? 'Aufgabe' : 'Aufgaben'}`}`} onKeyDown={event => keyDown(event, week * 7 + column)} onClick={() => choose(cell.date)} onFocus={() => setFocused(cell.date)}><span>{cell.day}</span>{taskCount > 0 && <Icon name="calendarTaskDot" />}</button></td>
        })}</tr>)}
      </tbody></table>
    </section>
    <section className="calendar-task-results" id="calendar-task-results" aria-labelledby="calendar-tasks-title" aria-busy={loading}>
      <div className="calendar-list-header"><h2 id="calendar-tasks-title" aria-live="polite" aria-atomic="true">{selectedDate ? `Deine Aufgaben am ${dateLabel(selectedDate)}` : `Deine Aufgaben im ${monthNames[month.month - 1]}`}</h2>{selectedDate && <button className="calendar-clear-selection" onClick={clearSelection}>Alle Aufgaben im Monat</button>}</div>
      {!unavailable && displayedTasks.length === 0 && <div className="task-empty"><h3>Keine Aufgaben {selectedDate ? 'an diesem Tag' : 'in diesem Monat'}</h3><p>Deine anderen Aufgaben bleiben unter „Aufgaben“ verfügbar.</p></div>}
      {!unavailable && renderTasks(displayedTasks.slice(0, count))}
      {!unavailable && displayedTasks.length > count && <button className="secondary-button load-more" onClick={() => setVisible({ key, count: count + 50 })}>Weitere Aufgaben anzeigen</button>}
    </section>
  </div>
}
