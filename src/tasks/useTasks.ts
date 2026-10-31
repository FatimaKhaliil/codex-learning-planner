import { useCallback, useEffect, useRef, useState } from 'react'
import type { Task } from './model'
import { taskErrorMessage } from './model'
import { loadAllTasks } from './queries'
import type { TaskRepository } from './repository'
export function useTasks(repository: TaskRepository | null) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const generation = useRef(0)
  const load = useCallback(async () => {
    const current = ++generation.current
    setLoading(true); setError('')
    try {
      if (!repository) throw new Error('tasks-not-configured')
      const result = await loadAllTasks(repository, () => current === generation.current)
      if (current === generation.current) setTasks(result)
    } catch (cause) { if (current === generation.current) { setTasks([]); setError(taskErrorMessage(cause)) } }
    finally { if (current === generation.current) setLoading(false) }
  }, [repository])
  useEffect(() => {
    setTasks([])
    void load()
    return () => { generation.current++ }
  }, [load])
  return { tasks, loading, error, reload: load }
}
