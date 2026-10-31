import { useCallback, useEffect, useRef, useState } from 'react'
import type { Task } from './model'
import { taskErrorMessage } from './model'
import type { TaskPage, TaskRepository } from './repository'
export function useTasks(repository: TaskRepository | null) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState<TaskPage | null>(null)
  const generation = useRef(0)
  const busy = useRef(false)
  const cursor = useRef<TaskPage['cursor']>(null)
  const load = useCallback(async (more = false) => {
    if (busy.current) return
    busy.current = true
    const current = ++generation.current
    setLoading(true); setError('')
    try {
      if (!repository) throw new Error('tasks-not-configured')
      const result = await repository.list(more ? cursor.current : null)
      if (current !== generation.current) return
      setTasks(previous => more ? [...previous, ...result.tasks.filter(task => !previous.some(item => item.id === task.id))] : result.tasks)
      cursor.current = result.cursor
      setPage(result)
    } catch (cause) { if (current === generation.current) setError(taskErrorMessage(cause)) }
    finally { if (current === generation.current) { busy.current = false; setLoading(false) } }
  }, [repository])
  useEffect(() => {
    busy.current = false
    setTasks([]); setPage(null); cursor.current = null
    void load()
    return () => { generation.current++; busy.current = false }
  }, [repository, load])
  return { tasks, loading, error, hasMore: page?.hasMore ?? false, reload: () => load(), loadMore: () => load(true) }
}
