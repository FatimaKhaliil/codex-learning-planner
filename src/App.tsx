import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { validateAuthForm } from './auth/validation'
import { authErrorMessage } from './auth/errors'
const TasksPanel = lazy(() => import('./tasks/TasksPanel').then(module => ({ default: module.TasksPanel })))

type View = 'login' | 'register' | 'reset' | 'dashboard' | 'tasks' | 'calendar' | 'profile'
type FieldErrors = Partial<Record<'email' | 'password' | 'confirmation', string>>

const paths: Record<View, string> = {
  login: '#/login', register: '#/register', reset: '#/reset-password', dashboard: '#/dashboard', tasks: '#/tasks', calendar: '#/calendar', profile: '#/profile',
}
function currentView(): View {
  return (Object.keys(paths) as View[]).find((view) => paths[view] === window.location.hash) ?? 'login'
}
function Brand() {
  return <div className="brand">
    <span className="brand-icon"><img src="/assets/notebook.png" width="20" height="20" alt="" /></span>
    Lernplaner
  </div>
}
function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="auth-layout">
    <aside className="editorial" aria-label="Über den Lernplaner">
      <img className="contour-circle" src="/assets/contour-circle.png" width="270" height="360" alt="" />
      <img className="decorative-circle" src="/assets/decorative-circle.png" width="200" height="150" alt="" />
      <Brand />
      <div className="editorial-copy">
        <p className="eyebrow">Dein Lernalltag, gut organisiert</p>
        <h2>Mehr Überblick.<br />Weniger Stress.</h2>
        <p>Plane Aufgaben, setze Prioritäten und sieh jederzeit, was als Nächstes ansteht.</p>
        <div className="benefit"><span><img src="/assets/check.png" width="20" height="20" alt="" /></span>
          <div><strong>Alles an einem Ort</strong><small>Aufgaben, Fächer und Fortschritt</small></div>
        </div>
      </div>
      <small className="editorial-footer">Lernplaner · Ein Projekt im Rahmen einer Bachelorarbeit</small>
    </aside>
    <header className="mobile-header"><Brand /></header>
    <main className="auth-main" id="main-content" tabIndex={-1}>{children}</main>
  </div>
}

const copy = {
  login: { label: 'Anmeldung', title: 'Willkommen zurück', description: 'Melde dich an und plane deine nächsten Lernschritte.', action: 'Anmelden', loading: 'Anmeldung läuft …' },
  register: { label: 'Registrierung', title: 'Dein Lernplan beginnt hier', description: 'Erstelle dein Konto und organisiere deine nächsten Lernschritte.', action: 'Konto erstellen', loading: 'Konto wird erstellt …' },
  reset: { label: 'Passwort zurücksetzen', title: 'Passwort zurücksetzen', description: 'Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum Zurücksetzen.', action: 'Link zum Zurücksetzen senden', loading: 'Link wird angefordert …' },
}

function AuthForm({ mode }: { mode: 'login' | 'register' | 'reset' }) {
  const auth = useAuth()
  const [values, setValues] = useState({ email: '', password: '', confirmation: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [notice, setNotice] = useState('')
  const [success, setSuccess] = useState(false)
  const [pending, setPending] = useState(false)
  const [visible, setVisible] = useState({ password: false, confirmation: false })
  const submitting = useRef(false)
  const text = copy[mode]

  function update(field: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setNotice('')
    setSuccess(false)
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const validation = validateAuthForm(mode, values)
    setErrors(validation)
    setNotice('')
    setSuccess(false)
    const firstError = Object.keys(validation)[0]
    if (firstError) {
      document.getElementById(firstError)?.focus()
      return
    }
    submitting.current = true
    setPending(true)
    try {
      const email = values.email.trim()
      if (mode === 'register') await auth.register(email, values.password)
      else if (mode === 'login') await auth.login(email, values.password)
      else {
        await auth.resetPassword(email)
        setSuccess(true)
        setNotice('Falls ein Konto zu dieser E-Mail-Adresse besteht, erhältst du einen Link zum Zurücksetzen. Bitte prüfe auch deinen Spam-Ordner.')
      }
      setValues((current) => ({ ...current, password: '', confirmation: '' }))
    } catch (error) {
      setNotice(authErrorMessage(error))
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  function passwordField(field: 'password' | 'confirmation', label: string) {
    const hint = field === 'password' && mode === 'register'
    return <div className="field">
      <label htmlFor={field}>{label}</label>
      <div className={`password-input ${errors[field] ? 'invalid' : ''}`}>
        <input id={field} name={field} type={visible[field] ? 'text' : 'password'} value={values[field]}
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required
          onChange={(event) => update(field, event.target.value)} aria-invalid={!!errors[field]}
          aria-describedby={[errors[field] && `${field}-error`, hint && 'password-hint'].filter(Boolean).join(' ') || undefined}
          placeholder={field === 'password' ? 'Dein Passwort' : 'Passwort wiederholen'} />
        <button type="button" className="password-toggle" aria-label={`${label} ${visible[field] ? 'verbergen' : 'anzeigen'}`}
          aria-pressed={visible[field]} onClick={() => setVisible((current) => ({ ...current, [field]: !current[field] }))}>
          <img src="/assets/eye.png" width="20" height="20" alt="" />
        </button>
      </div>
      {hint && <small id="password-hint">Mindestens 6 Zeichen.</small>}
      {errors[field] && <p className="field-error" id={`${field}-error`}>{errors[field]}</p>}
    </div>
  }

  return <section className="auth-card" aria-labelledby="form-title">
    <div className="form-heading"><p className="form-label">{text.label}</p>
      <h1 id="form-title">{text.title}</h1><p>{text.description}</p></div>
    {auth.configurationError && <p className="notice error" role="alert">Die Anmeldung ist noch nicht eingerichtet. Bitte versuche es später erneut.</p>}
    {notice && <p className={`notice ${success ? 'success' : 'error'}`} role={success ? 'status' : 'alert'}>{notice}</p>}
    <form noValidate onSubmit={submit} aria-busy={pending}>
      <fieldset disabled={pending || !!auth.configurationError}>
        <legend className="sr-only">{text.label}</legend>
        <div className="fields">
          <div className="field"><label htmlFor="email">E-Mail</label>
            <input id="email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
              value={values.email} onChange={(event) => update('email', event.target.value)} required placeholder="name@beispiel.de"
              aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} />
            {errors.email && <p className="field-error" id="email-error">{errors.email}</p>}
          </div>
          {mode !== 'reset' && passwordField('password', 'Passwort')}
          {mode === 'register' && passwordField('confirmation', 'Passwort bestätigen')}
          {mode === 'login' && <a className="forgot-link" href={paths.reset} aria-disabled={pending} onClick={(event) => pending && event.preventDefault()}>Passwort vergessen?</a>}
        </div>
        <button className="primary-button" type="submit">{pending && <span className="spinner" aria-hidden="true" />}{pending ? text.loading : text.action}</button>
      </fieldset>
      {Object.values(errors).some(Boolean) && <p className="sr-only" role="alert">Bitte korrigiere die markierten Formularfelder.</p>}
    </form>
    <p className="account-switch">{mode === 'login' ? <>Noch kein Konto? <a href={paths.register} aria-disabled={pending} onClick={(event) => pending && event.preventDefault()}>Jetzt registrieren</a></>
      : mode === 'register' ? <>Bereits ein Konto? <a href={paths.login} aria-disabled={pending} onClick={(event) => pending && event.preventDefault()}>Zur Anmeldung</a></>
      : <>Zurück zur <a href={paths.login} aria-disabled={pending} onClick={(event) => pending && event.preventDefault()}>Anmeldung</a></>}</p>
  </section>
}

function AuthenticatedApp() {
  const auth = useAuth()
  const [view, setView] = useState(currentView)
  useEffect(() => {
    const changed = () => setView(currentView())
    window.addEventListener('hashchange', changed)
    return () => window.removeEventListener('hashchange', changed)
  }, [])
  useEffect(() => {
    if (auth.initializing || auth.observerError) return
    const protectedView = ['dashboard', 'tasks', 'calendar', 'profile'].includes(view)
    const target = auth.user ? protectedView ? view : 'dashboard' : protectedView ? 'login' : view
    if (window.location.hash !== paths[target]) window.location.replace(paths[target])
  }, [auth.user, auth.initializing, auth.observerError, view])
  if (auth.initializing) return <AuthLayout><div className="auth-card" role="status"><span className="spinner" aria-hidden="true" /> Anmeldung wird geprüft …</div></AuthLayout>
  if (auth.observerError) return <AuthLayout><section className="auth-card"><h1>Anmeldung nicht verfügbar</h1><p className="notice error" role="alert">{auth.observerError}</p><button className="primary-button" onClick={() => window.location.reload()}>Erneut versuchen</button></section></AuthLayout>
  if (auth.user) return <Suspense fallback={<p role="status">Lernplaner wird geladen …</p>}><TasksPanel key={auth.user.uid} userId={auth.user.uid} view={view === 'tasks' || view === 'calendar' || view === 'profile' ? view : 'dashboard'} /></Suspense>
  return <AuthLayout><AuthForm key={view} mode={view === 'register' || view === 'reset' ? view : 'login'} /></AuthLayout>
}

export default function App() {
  return <AuthProvider><a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); document.getElementById('main-content')?.focus() }}>Zum Inhalt</a><AuthenticatedApp /></AuthProvider>
}
