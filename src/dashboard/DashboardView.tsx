import { useMemo } from 'react'
import type { ReactNode } from 'react'
import type { AppIdentity } from '../layout/AppLayout'
import { ProgressCard } from '../tasks/ProgressCard'
import type { Task } from '../tasks/model'
import { dashboardMetrics, upcomingTasks } from './model'
import './dashboard.css'

interface Props {
  tasks: readonly Task[]
  loading: boolean
  error: string
  identity?: AppIdentity
  renderTasks: (tasks: Task[]) => ReactNode
  onAdd: () => void
  addDisabled: boolean
}

export function DashboardView({ tasks, loading, error, identity, renderTasks, onAdd, addDisabled }: Props) {
  const metrics = useMemo(() => dashboardMetrics(tasks), [tasks])
  const upcoming = useMemo(() => upcomingTasks(tasks), [tasks])
  const firstName = identity?.displayName?.trim().split(/\s+/)[0]
  const ready = !loading && !error
  return <div className="dashboard-view" aria-busy={loading}>
    <div className="overview-intro">
      <h2 data-page-heading tabIndex={-1}>Hallo{firstName ? ` ${firstName}` : ''}, schön, dass du da bist.</h2>
      <p>Dein Lernalltag, gut organisiert. Das steht als Nächstes an.</p>
    </div>
    {ready && <>
      <ProgressCard tasks={tasks} />
      <div className="statistics" role="group" aria-label="Aufgabenstatistik">
        <div><strong>{metrics.incomplete}</strong><span>Nicht abgeschlossen</span><span className="sr-only">Davon {metrics.open} offen, {metrics.inProgress} in Bearbeitung.</span></div>
        <div><strong>{metrics.done}</strong><span>Erledigt</span></div>
        <div><strong>{metrics.total}</strong><span>Gesamt</span></div>
      </div>
      <section className="overview-next" aria-labelledby="dashboard-next-title">
        <div className="task-list-heading"><h2 id="dashboard-next-title">Deine nächsten Lernschritte</h2></div>
        {tasks.length === 0 ? <div className="task-empty"><h3>Noch keine Aufgaben</h3><p>Erstelle deine erste Aufgabe und plane deinen nächsten Lernschritt.</p><button className="secondary-button" disabled={addDisabled} onClick={onAdd}>Erste Aufgabe erstellen</button></div>
          : upcoming.length === 0 ? <div className="task-empty"><h3>Alles erledigt</h3><p>Du hast alle Aufgaben abgeschlossen. Dein nächster Lernschritt wartet auf dich.</p><button className="secondary-button" disabled={addDisabled} onClick={onAdd}>Aufgabe hinzufügen</button></div>
          : renderTasks(upcoming)}
        <a className="secondary-button all-tasks-link" href="#/tasks">Alle Aufgaben ansehen</a>
      </section>
    </>}
  </div>
}
