import type { AppIdentity } from '../layout/AppLayout'
import { Icon } from '../layout/Icon'
import { ProgressCard } from '../tasks/ProgressCard'
import type { Task } from '../tasks/model'
import './profile.css'

interface Props {
  identity: AppIdentity
  tasks: readonly Task[]
  loading: boolean
  error: string
  onReload: () => void
  onLogout: () => void
  loggingOut: boolean
  logoutError?: string
}

export function ProfileView({ identity, tasks, loading, error, onReload, onLogout, loggingOut, logoutError }: Props) {
  const displayName = identity.displayName?.trim() || identity.email || 'Dein Konto'
  const initials = (identity.displayName?.trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0]).join('') ||
    Array.from(identity.email ?? '')[0] || 'K').toLocaleUpperCase('de')

  return <section className="profile-view" aria-labelledby="profile-title">
    <h2 id="profile-title" data-page-heading tabIndex={-1}>Dein Profil</h2>
    <div className="profile-identity">
      <span className="profile-avatar" aria-hidden="true">{initials}</span>
      <div className="profile-identity-copy"><strong>{displayName}</strong><p>Dein Konto · Lernplaner</p></div>
    </div>
    <div className="profile-field">
      <label htmlFor="profile-name">Name</label>
      <input id="profile-name" type="text" value={identity.displayName ?? ''} placeholder="Kein Name hinterlegt" readOnly aria-describedby="profile-readonly-note" />
    </div>
    <div className="profile-field">
      <label htmlFor="profile-email">E-Mail</label>
      <input id="profile-email" type="email" value={identity.email ?? ''} placeholder="Keine E-Mail hinterlegt" readOnly aria-describedby="profile-readonly-note" />
    </div>
    <div className="profile-task-progress" aria-busy={loading}>
      {loading && <p className="profile-loading" role="status"><span className="spinner" aria-hidden="true" /> Aufgaben werden geladen …</p>}
      {!loading && error && <div className="notice error" role="alert"><p>{error}</p><button className="secondary-button" onClick={onReload}>Erneut versuchen</button></div>}
      {!loading && !error && <ProgressCard tasks={tasks} />}
    </div>
    <p id="profile-readonly-note" className="profile-note">Name und E-Mail stammen aus deinem Konto und sind hier schreibgeschützt.</p>
    <button className="primary-button profile-logout" onClick={onLogout} disabled={loggingOut}>
      {loggingOut ? <span className="spinner" aria-hidden="true" /> : <Icon name="profileLogout" />}
      {loggingOut ? 'Abmeldung läuft …' : 'Abmelden'}
    </button>
    {logoutError && <p className="notice error" role="alert">{logoutError}</p>}
  </section>
}
