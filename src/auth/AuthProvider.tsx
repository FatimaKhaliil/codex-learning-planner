import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { authErrorCode } from './errors'
import { authentication } from './firebaseAuth'
import { normalizeDisplayName } from './displayName'

interface AuthContextValue {
  user: User | null
  initializing: boolean
  configurationError: string | null
  observerError: string | null
  register: (email: string, password: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateDisplayName: (displayName: string) => Promise<void>
  savingDisplayName: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function requireAuth() {
  if (!authentication.auth) {
    throw Object.assign(new Error('Authentication is not configured.'), {
      code: 'auth/configuration-not-ready',
    })
  }
  return authentication.auth
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [initializing, setInitializing] = useState(authentication.auth !== null)
  const [observerError, setObserverError] = useState<string | null>(null)
  const [profileRevision, setProfileRevision] = useState(0)
  const [savingDisplayName, setSavingDisplayName] = useState(false)
  const updatingProfile = useRef(false)

  useEffect(() => {
    if (!authentication.auth) return

    let active = true
    try {
      const unsubscribe = onAuthStateChanged(
        authentication.auth,
        (nextUser) => {
          if (!active) return
          // Firebase's observer is the only source of the application user.
          setUser(nextUser)
          setObserverError(null)
          setInitializing(false)
        },
        () => {
          if (!active) return
          setObserverError('Dein Anmeldestatus konnte nicht sicher ermittelt werden. Bitte lade die Seite erneut.')
          setInitializing(false)
        },
      )

      return () => {
        active = false
        unsubscribe()
      }
    } catch {
      setObserverError('Dein Anmeldestatus konnte nicht sicher ermittelt werden. Bitte lade die Seite erneut.')
      setInitializing(false)
      return () => { active = false }
    }
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    await createUserWithEmailAndPassword(requireAuth(), email.trim(), password)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(requireAuth(), email.trim(), password)
  }, [])

  const logout = useCallback(async () => {
    await signOut(requireAuth())
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(requireAuth(), email.trim())
    } catch (error) {
      // Projects without email enumeration protection can return user-not-found.
      // Keep the same successful UI response for known and unknown addresses.
      if (authErrorCode(error) !== 'auth/user-not-found') throw error
    }
  }, [])

  const updateDisplayName = useCallback(async (value: string) => {
    const displayName = normalizeDisplayName(value)
    const auth = requireAuth()
    const target = auth.currentUser
    // Bind the operation to the observer's current user, including the narrow
    // interval in which Auth has changed but React has not rendered it yet.
    if (!target || target !== user || observerError) {
      throw Object.assign(new Error('Profile session changed.'), { code: 'profile/session-changed' })
    }
    if (updatingProfile.current) {
      throw Object.assign(new Error('Profile save in progress.'), { code: 'profile/save-in-progress' })
    }
    updatingProfile.current = true
    setSavingDisplayName(true)
    try {
      await updateProfile(target, { displayName })
      if (auth.currentUser !== target) {
        throw Object.assign(new Error('Profile session changed.'), { code: 'profile/session-changed' })
      }
      // updateProfile mutates the SDK User in place. Neither onAuthStateChanged
      // nor setUser(theSameUser) guarantees a React render. Publish a new context
      // value explicitly without cloning User or remounting the UID workspace.
      setProfileRevision(revision => revision + 1)
    } finally {
      updatingProfile.current = false
      setSavingDisplayName(false)
    }
  }, [user, observerError])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    initializing,
    configurationError: authentication.configurationError,
    observerError,
    register,
    login,
    logout,
    resetPassword,
    updateDisplayName,
    savingDisplayName,
  }), [user, initializing, observerError, register, login, logout, resetPassword, updateDisplayName, profileRevision, savingDisplayName])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider.')
  return context
}
