import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { firebaseApp } from '../lib/firebase'
import { createTaskRepository } from './repository'
import { assertEvaluationEnv, assertEvaluationTaskCache, evaluationMode, hasEvaluationTaskCache } from '../../config/evaluation-policy'
import type { FirebaseApp } from 'firebase/app'
function initialize() {
  if (!firebaseApp) return null
  const evaluating = import.meta.env.MODE === evaluationMode
  if (evaluating) assertEvaluationEnv(import.meta.env, import.meta.env.DEV === true)
  const db = getFirestore(firebaseApp)
  if (evaluating && db.app !== firebaseApp) throw new Error('invalid-evaluation-firestore-binding')
  const address = import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_URL
  if (import.meta.env.DEV && address) {
    const url = new URL(address)
    if (url.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(url.hostname) || url.username || url.password || url.pathname !== '/' || url.search || url.hash || !url.port) throw new Error('invalid-emulator-address')
    // Cache the instance through HMR so emulator wiring happens only once.
    connectFirestoreEmulator(db, url.hostname, Number(url.port))
  }
  return db
}
const state = import.meta.hot?.data as {
  tasksDb?: ReturnType<typeof initialize>; initialized?: boolean
  evaluationApp?: FirebaseApp; evaluationMode?: string; evaluationAddress?: string
} | undefined
let db: ReturnType<typeof initialize> = null
try {
  // A rejected Firebase app must never be bypassed through an earlier HMR cache.
  if (firebaseApp) {
    const evaluating = import.meta.env.MODE === evaluationMode
    const address = import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_URL
    if (evaluating && hasEvaluationTaskCache(state)) {
      assertEvaluationEnv(import.meta.env, import.meta.env.DEV === true)
      assertEvaluationTaskCache(state, firebaseApp, import.meta.env.MODE, address)
      db = state?.tasksDb ?? null
    } else db = state?.initialized ? state.tasksDb ?? null : initialize()
    if (state) {
      state.tasksDb = db; state.initialized = true
      if (evaluating && db) {
        state.evaluationApp = firebaseApp; state.evaluationMode = import.meta.env.MODE; state.evaluationAddress = address
      } else {
        delete state.evaluationApp; delete state.evaluationMode; delete state.evaluationAddress
      }
    }
  }
} catch { /* Fail closed: no production fallback for invalid emulator configuration. */ }
export function tasksForUser(userId: string) {
  if (!db) throw new Error('tasks-not-configured')
  return createTaskRepository(db, userId)
}
