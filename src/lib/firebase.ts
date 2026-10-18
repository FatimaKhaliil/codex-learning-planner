import { getApp, getApps, initializeApp } from 'firebase/app'
import type { FirebaseApp, FirebaseOptions } from 'firebase/app'

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const configurationMessage =
  'Firebase ist noch nicht korrekt eingerichtet. Bitte die Firebase-Webkonfiguration in .env.local prüfen und den Entwicklungsserver neu starten.'

function initializeFirebase(): {
  app: FirebaseApp | null
  configurationError: string | null
} {
  // Storage and messaging settings are optional for Authentication.
  const requiredSettings = [
    firebaseConfig.apiKey,
    firebaseConfig.authDomain,
    firebaseConfig.projectId,
    firebaseConfig.appId,
  ]
  const configured = requiredSettings.every(
    (value) =>
      typeof value === 'string' &&
      value.trim().length > 0 &&
      !/^(?:your|dein|replace|placeholder|changeme)(?:[-_ ]|$)/i.test(value) &&
      !/^<.*>$/.test(value),
  )

  if (!configured) return { app: null, configurationError: configurationMessage }

  try {
    // Reuse the default app during Vite hot module replacement.
    return {
      app: getApps().length ? getApp() : initializeApp(firebaseConfig),
      configurationError: null,
    }
  } catch {
    // Malformed local configuration must not prevent React from rendering.
    return { app: null, configurationError: configurationMessage }
  }
}

const initialization = initializeFirebase()
export const firebaseApp = initialization.app
export const firebaseConfigurationError = initialization.configurationError
