import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { authErrorCode } from './errors'
import { authentication } from './firebaseAuth'

interface AuthContextValue {
  user: User | null
  initializing: boolean
  configurationError: string | null
  observerError: string | null
  register: (email: string, password: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
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

  const value = useMemo<AuthContextValue>(() => ({
    user,
    initializing,
    configurationError: authentication.configurationError,
    observerError,
    register,
    login,
    logout,
    resetPassword,
  }), [user, initializing, observerError, register, login, logout, resetPassword])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider.')
  return context
}
