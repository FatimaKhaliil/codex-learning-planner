export const taskStatuses = ['open', 'in-progress', 'done'] as const
export type TaskStatus = typeof taskStatuses[number]
export const statusLabels: Record<TaskStatus, string> = { open: 'Offen', 'in-progress': 'In Bearbeitung', done: 'Erledigt' }
export interface TaskInput { title: string; dueDate: string; description: string; subject: string; status: TaskStatus }
export interface Task extends TaskInput { id: string }
export const emptyTask: TaskInput = { title: '', dueDate: '', description: '', subject: '', status: 'open' }
export type TaskErrors = Partial<Record<keyof TaskInput, string>>
export function validDate(value: string): boolean {
  if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
}
export function validateTask(value: TaskInput): TaskErrors {
  const errors: TaskErrors = {}
  if (!value.title.trim()) errors.title = 'Bitte gib einen Titel ein.'
  else if (value.title.trim().length > 200) errors.title = 'Der Titel darf höchstens 200 Zeichen enthalten.'
  if (!validDate(value.dueDate)) errors.dueDate = 'Bitte gib ein gültiges Fälligkeitsdatum ein.'
  if (value.description.trim().length > 5000) errors.description = 'Die Beschreibung darf höchstens 5000 Zeichen enthalten.'
  if (value.subject.trim().length > 100) errors.subject = 'Das Fach darf höchstens 100 Zeichen enthalten.'
  if (!taskStatuses.includes(value.status)) errors.status = 'Bitte wähle einen gültigen Status.'
  return errors
}
export function normalizeTask(value: TaskInput): TaskInput {
  if (Object.keys(validateTask(value)).length) throw new Error('invalid-task')
  return { title: value.title.trim(), dueDate: value.dueDate, description: value.description.trim(), subject: value.subject.trim(), status: value.status }
}
export function taskErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : ''
  if (code === 'permission-denied') return 'Kein Zugriff auf diese Aufgaben. Bitte prüfe deine Anmeldung oder melde dich erneut an.'
  if (code === 'unavailable' || code === 'deadline-exceeded') return 'Die Verbindung zu den Aufgaben ist unterbrochen. Bitte prüfe deine Internetverbindung und versuche es erneut.'
  if (code === 'not-found') return 'Diese Aufgabe wurde inzwischen gelöscht. Bitte lade die Aufgaben erneut.'
  return 'Die Aufgaben konnten nicht verarbeitet werden. Bitte versuche es erneut.'
}
