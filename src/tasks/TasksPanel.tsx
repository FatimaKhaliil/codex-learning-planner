import { useMemo } from 'react'
import { tasksForUser } from './firebaseTasks'
import { TaskWorkspace } from './TaskWorkspace'
export function TasksPanel({ userId }: { userId: string }) {
  const repository = useMemo(() => { try { return tasksForUser(userId) } catch { return null } }, [userId])
  return <TaskWorkspace key={userId} repository={repository} />
}
