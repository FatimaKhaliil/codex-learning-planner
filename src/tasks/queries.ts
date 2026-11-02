import type { Task, TaskStatus } from './model.ts'
import type { TaskRepository } from './repository.ts'
export type TaskFilter = 'all' | TaskStatus
// Read all cursor pages before publishing a complete collection. Never present
// partial results as a global total or a complete search result.
export async function loadAllTasks(repository: TaskRepository, active = () => true): Promise<Task[]> {
  const result = new Map<string, Task>()
  const seen = new Set<string>()
  let cursor = null
  while (active()) {
    const page = await repository.list(cursor)
    if (!active()) return []
    for (const task of page.tasks) result.set(task.id, task)
    if (!page.hasMore) return [...result.values()]
    if (!page.cursor || !page.tasks.length || seen.has(page.cursor.id)) throw new Error('invalid-pagination')
    seen.add(page.cursor.id)
    cursor = page.cursor
  }
  return []
}
export function filterTasks(tasks: readonly Task[], search: string, filter: TaskFilter): Task[] {
  const text = search.trim().toLocaleLowerCase('de')
  return tasks.filter(task => (filter === 'all' || task.status === filter) &&
    (!text || [task.title, task.description, task.subject].some(value => value.toLocaleLowerCase('de').includes(text))))
}
export function taskProgress(tasks: readonly Task[]) {
  const total = tasks.length
  const done = tasks.filter(task => task.status === 'done').length
  return { total, done, open: total - done, percent: total ? done / total * 100 : 0 }
}
