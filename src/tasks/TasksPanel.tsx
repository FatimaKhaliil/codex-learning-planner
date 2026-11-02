import { useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { authErrorMessage } from '../auth/errors'
import type { AppView } from '../layout/AppLayout'
import { tasksForUser } from './firebaseTasks'
import { TaskWorkspace } from './TaskWorkspace'
export function TasksPanel({ userId, view }: { userId: string; view: AppView }) {
  const { user, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const repository = useMemo(() => { try { return tasksForUser(userId) } catch { return null } }, [userId])
  async function signOut() {
    if (loggingOut) return
    setLoggingOut(true); setLogoutError('')
    try { await logout() } catch (cause) { setLogoutError(authErrorMessage(cause)) } finally { setLoggingOut(false) }
  }
  if (!user) return null
  return <TaskWorkspace key={userId} repository={repository} view={view} identity={{ email: user.email, displayName: user.displayName }} onLogout={() => void signOut()} loggingOut={loggingOut} logoutError={logoutError} />
}
