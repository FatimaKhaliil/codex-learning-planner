import { Icon } from '../layout/Icon'
import type { Task } from './model'
import { taskProgress } from './queries'
export function ProgressCard({ tasks }: { tasks: readonly Task[] }) {
  const progress = taskProgress(tasks)
  return <section className="progress-card" aria-label="Dein Aufgabenfortschritt">
    <span className="progress-icon"><Icon name="check" /></span>
    <div className="progress-copy"><strong>{progress.open} {progress.open === 1 ? 'Aufgabe offen' : 'Aufgaben offen'}</strong><p>{progress.done} von {progress.total} erledigt{progress.total > 0 && ' · Weiter so!'}</p></div>
    <progress className="task-progress" max={progress.total || 1} value={progress.done} aria-label={`${progress.done} von ${progress.total} Aufgaben erledigt`} />
  </section>
}
