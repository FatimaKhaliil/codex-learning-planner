import { connectAuthEmulator, getAuth } from 'firebase/auth'
import type { Auth } from 'firebase/auth'
import { firebaseApp, firebaseConfigurationError } from '../lib/firebase'
import { assertEvaluationAuthBinding, assertEvaluationEnv, evaluationMode } from '../../config/evaluation-policy'

function initializeAuthentication(): { auth: Auth | null; configurationError: string | null } {
  if (!firebaseApp) {
    return {
      auth: null,
      configurationError: firebaseConfigurationError ?? 'Firebase ist noch nicht eingerichtet.',
    }
  }

  try {
    const evaluating = import.meta.env.MODE === evaluationMode
    if (evaluating) assertEvaluationEnv(import.meta.env, import.meta.env.DEV === true)
    const auth = getAuth(firebaseApp)
    if (evaluating && auth.app !== firebaseApp) throw new Error('invalid-evaluation-auth-binding')
    auth.languageCode = 'de'

    const emulatorAddress = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL
    if (import.meta.env.DEV && emulatorAddress) {
      const emulator = new URL(emulatorAddress)
      if (
        !['http:', 'https:'].includes(emulator.protocol) ||
        !['localhost', '127.0.0.1'].includes(emulator.hostname) ||
        emulator.username || emulator.password ||
        emulator.pathname !== '/' || emulator.search || emulator.hash
      ) {
        return {
          auth: null,
          configurationError: 'Der Auth-Emulator muss eine lokale HTTP-Adresse mit localhost oder 127.0.0.1 verwenden.',
        }
      }

      // HMR must not connect the same Auth instance to the emulator twice.
      if (!auth.emulatorConfig) connectAuthEmulator(auth, emulator.origin)
      if (evaluating) assertEvaluationAuthBinding(auth, firebaseApp)
    }

    return { auth, configurationError: null }
  } catch {
    return {
      auth: null,
      configurationError: 'Firebase Authentication konnte nicht eingerichtet werden. Bitte die Firebase-Webkonfiguration und gegebenenfalls die lokale Emulator-Adresse prüfen.',
    }
  }
}

export const authentication = initializeAuthentication()
