import type { ReactNode } from 'react'
import { Icon } from './Icon'
export type AppView = 'dashboard' | 'tasks' | 'calendar' | 'profile'
export interface AppIdentity { email: string | null; displayName: string | null }
interface Props {
  view: AppView; title: string; identity: AppIdentity; openCount?: number; children: ReactNode
  onAdd: () => void; addDisabled: boolean; search: string; onSearch: (value: string) => void
  onLogout: () => void; loggingOut: boolean
}
export function AppLayout({ view, title, identity, openCount, children, onAdd, addDisabled, search, onSearch, onLogout, loggingOut }: Props) {
  const name = identity.displayName?.trim() || identity.email || 'Dein Konto'
  const initials = (identity.displayName?.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join('') || identity.email?.slice(0, 1) || 'K').toUpperCase()
  const date = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()).toLocaleUpperCase('de')
  const links = [{ view: 'dashboard', label: 'Übersicht' }, { view: 'tasks', label: 'Aufgaben' }, { view: 'calendar', label: 'Kalender' }] as const
  const taskContext = view === 'tasks'
  function navigation(mobile: boolean) {
    return <nav className={mobile ? 'bottom-navigation' : 'app-navigation'} aria-label={mobile ? 'Mobile Hauptnavigation' : 'Hauptnavigation'}>{links.map(link => <a href={`#/${link.view}`} key={link.view} aria-current={view === link.view ? 'page' : undefined}>
      <Icon name={link.view === 'dashboard' ? view === 'dashboard' ? 'gridActive' : mobile ? 'grid' : 'gridSidebar' : link.view === 'tasks' ? view === 'tasks' ? 'notebook' : 'notebookMuted' : mobile ? 'calendar' : 'calendarSidebar'} />
      <span>{link.label}</span>{link.view === 'tasks' && openCount !== undefined && !mobile && <span className="nav-count">{openCount}</span>}
    </a>)}</nav>
  }
  return <div className="planner-layout">
    <aside className="planner-sidebar"><div><a className="brand" href="#/dashboard"><span className="brand-icon"><Icon name="notebook" /></span>Lernplaner</a>{navigation(false)}</div>
      <div className="planner-account"><a href="#/profile" className="profile-link" aria-label="Benutzerprofil öffnen"><span className="avatar" aria-hidden="true">{initials}</span><span><strong>{name}</strong><small>{identity.email}</small></span></a>
        <button className="icon-button sidebar-signout" aria-label={loggingOut ? 'Abmeldung läuft …' : 'Abmelden'} onClick={onLogout} disabled={loggingOut}><Icon name="logout" /></button></div>
    </aside>
    <div className="planner-main"><header className="planner-header"><div><p>{date}</p><h1>{title}</h1></div><div className="header-actions">
      {taskContext && <label className="header-search"><Icon name="search" /><span className="sr-only">Aufgaben suchen</span><input type="search" value={search} onChange={e => onSearch(e.target.value)} placeholder="Suchen …" /></label>}
      {taskContext && <button className="primary-button header-add" disabled={addDisabled} onClick={onAdd} aria-label="Aufgabe hinzufügen"><Icon name="plus" /><span>Aufgabe hinzufügen</span></button>}
      <a className="icon-button header-profile" href="#/profile" aria-label="Benutzerprofil öffnen"><Icon name="user" /></a>
    </div></header><main className="planner-content" id="main-content" tabIndex={-1}>{children}</main>{navigation(true)}</div>
  </div>
}
