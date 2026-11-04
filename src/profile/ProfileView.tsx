import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { DISPLAY_NAME_MAX_LENGTH, normalizeDisplayName, validateDisplayName } from '../auth/displayName'
import { authErrorCode, authErrorMessage } from '../auth/errors'
import type { AppIdentity } from '../layout/AppLayout'
import { identityInitials } from '../layout/identity'
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
  onSaveDisplayName?: (name: string) => Promise<void>
  savingDisplayName?: boolean
}

export function ProfileView({ identity, tasks, loading, error, onReload, onLogout, loggingOut, logoutError, onSaveDisplayName, savingDisplayName = false }: Props) {
  const displayName = identity.displayName?.trim() || identity.email || 'Dein Konto'
  const initials = identityInitials(identity.displayName, identity.email)
  const [name, setName] = useState(identity.displayName ?? '')
  const [fieldError, setFieldError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const pending = saving || savingDisplayName
  const input = useRef<HTMLInputElement>(null)
  const lock = useRef(false)
  const alive = useRef(true)
  const generation = useRef(0)

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false; generation.current++ }
  }, [])
  useEffect(() => { setName(identity.displayName ?? '') }, [identity.displayName, identity.email])
  useEffect(() => {
    generation.current++
    lock.current = false
    setSaving(false); setFieldError(''); setSaveError(''); setSuccess('')
  }, [identity.email])

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!onSaveDisplayName || lock.current || savingDisplayName || loggingOut) return
    setFieldError(''); setSaveError(''); setSuccess('')
    const invalid = validateDisplayName(name)
    if (invalid) { setFieldError(invalid); input.current?.focus(); return }
    const normalized = normalizeDisplayName(name)
    const current = generation.current
    lock.current = true
    setSaving(true)
    try {
      await onSaveDisplayName(normalized)
      if (!alive.current || current !== generation.current) return
      setName(normalized)
      setSuccess('Name gespeichert.')
    } catch (cause) {
      if (!alive.current || current !== generation.current) return
      if (authErrorCode(cause) === 'profile/invalid-display-name') {
        setFieldError(validateDisplayName(name) ?? `Bitte gib einen gültigen Namen mit höchstens ${DISPLAY_NAME_MAX_LENGTH} Zeichen ein.`)
        requestAnimationFrame(() => {
          if (alive.current && current === generation.current) input.current?.focus()
        })
      } else if (authErrorCode(cause) === 'profile/session-changed') {
        setSaveError('Deine Anmeldung hat sich geändert. Bitte melde dich erneut an und speichere den Namen noch einmal.')
      } else if (authErrorCode(cause) === 'profile/save-in-progress') {
        setSaveError('Dein Name wird bereits gespeichert. Bitte warte einen Moment und versuche es dann erneut.')
      } else setSaveError(authErrorMessage(cause))
    } finally {
      if (alive.current && current === generation.current) { lock.current = false; setSaving(false) }
    }
  }

  const nameField = <div className="profile-field">
    <label htmlFor="profile-name">Name</label>
    <input ref={input} id="profile-name" type="text" value={name} placeholder="Kein Name hinterlegt" readOnly={!onSaveDisplayName}
      disabled={pending || loggingOut} maxLength={DISPLAY_NAME_MAX_LENGTH * 2} autoComplete="name"
      aria-invalid={fieldError ? true : undefined}
      aria-describedby={onSaveDisplayName ? `profile-name-hint${fieldError ? ' profile-name-error' : ''}` : 'profile-readonly-note'}
      onChange={event => { setName(event.target.value); setFieldError(''); setSaveError(''); setSuccess('') }} />
    {fieldError && <p id="profile-name-error" className="field-error" role="alert">{fieldError}</p>}
  </div>

  return <section className="profile-view" aria-labelledby="profile-title">
    <h2 id="profile-title" data-page-heading tabIndex={-1}>Dein Profil</h2>
    <div className="profile-identity">
      <span className="profile-avatar" aria-hidden="true">{initials}</span>
      <div className="profile-identity-copy"><strong>{displayName}</strong><p>Dein Konto · Lernplaner</p></div>
    </div>
    {onSaveDisplayName ? <form className="profile-name-form" onSubmit={event => void saveName(event)} noValidate aria-busy={pending}>
      {nameField}
      <p id="profile-name-hint" className="profile-note">Höchstens {DISPLAY_NAME_MAX_LENGTH} Zeichen. Nur der Name wird gespeichert.</p>
      <button className="primary-button profile-name-save" type="submit" disabled={pending || loggingOut}>
        {pending && <span className="spinner" aria-hidden="true" />}{pending ? 'Name wird gespeichert …' : 'Namen speichern'}
      </button>
      {saveError && <p className="notice error" role="alert">{saveError}</p>}
      {success && <p className="notice success" role="status">{success}</p>}
    </form> : nameField}
    <div className="profile-field">
      <label htmlFor="profile-email">E-Mail</label>
      <input id="profile-email" type="email" value={identity.email ?? ''} placeholder="Keine E-Mail hinterlegt" readOnly aria-describedby="profile-readonly-note" />
    </div>
    <div className="profile-task-progress" aria-busy={loading}>
      {loading && <p className="profile-loading" role="status"><span className="spinner" aria-hidden="true" /> Aufgaben werden geladen …</p>}
      {!loading && error && <div className="notice error" role="alert"><p>{error}</p><button className="secondary-button" onClick={onReload}>Erneut versuchen</button></div>}
      {!loading && !error && <ProgressCard tasks={tasks} />}
    </div>
    <p id="profile-readonly-note" className="profile-note">{onSaveDisplayName ? 'Deine E-Mail-Adresse ist hier schreibgeschützt. Änderungen am Namen werden erst beim Speichern übernommen.' : 'Name und E-Mail stammen aus deinem Konto und sind hier schreibgeschützt.'}</p>
    <button className="primary-button profile-logout" onClick={onLogout} disabled={loggingOut || pending}>
      {loggingOut ? <span className="spinner" aria-hidden="true" /> : <Icon name="profileLogout" />}
      {loggingOut ? 'Abmeldung läuft …' : 'Abmelden'}
    </button>
    {logoutError && <p className="notice error" role="alert">{logoutError}</p>}
  </section>
}
