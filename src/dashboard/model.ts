import type { Task } from '../tasks/model.ts'
import { validDate } from '../tasks/model.ts'
import { taskProgress } from '../tasks/queries.ts'

// These calculations always receive the complete loaded user collection.
export function dashboardMetrics(tasks: readonly Task[]) {
  const progress = taskProgress(tasks)
  const open = tasks.filter(task => task.status === 'open').length
  const inProgress = tasks.filter(task => task.status === 'in-progress').length
  return { total: progress.total, open, inProgress, done: progress.done, incomplete: progress.open, percent: progress.percent }
}

function compareKey(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

// Overdue tasks remain actionable. Valid date keys sort chronologically without
// timezone conversion; missing/invalid dates follow them, then document ID breaks
// ties using locale-independent code-unit order. Firestore document IDs are unique.
export function upcomingTasks(tasks: readonly Task[], limit = 3): Task[] {
  if (!Number.isSafeInteger(limit) || limit < 0) throw new RangeError('invalid-dashboard-limit')
  return tasks.filter(task => task.status !== 'done').sort((left, right) => {
    const leftDate = validDate(left.dueDate) ? left.dueDate : null
    const rightDate = validDate(right.dueDate) ? right.dueDate : null
    if (leftDate !== null && rightDate === null) return -1
    if (leftDate === null && rightDate !== null) return 1
    return (leftDate !== null && rightDate !== null ? compareKey(leftDate, rightDate) : 0) || compareKey(left.id, right.id)
  }).slice(0, limit)
}
