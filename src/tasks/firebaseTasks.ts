import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { firebaseApp } from '../lib/firebase'
import { createTaskRepository } from './repository'
function initialize() {
  if (!firebaseApp) return null
  const db = getFirestore(firebaseApp)
  const address = import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_URL
  if (import.meta.env.DEV && address) {
    const url = new URL(address)
    if (url.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(url.hostname) || url.username || url.password || url.pathname !== '/' || url.search || url.hash || !url.port) throw new Error('invalid-emulator-address')
    // Cache the instance through HMR so emulator wiring happens only once.
    connectFirestoreEmulator(db, url.hostname, Number(url.port))
  }
  return db
}
const state = import.meta.hot?.data as { tasksDb?: ReturnType<typeof initialize>; initialized?: boolean } | undefined
let db: ReturnType<typeof initialize> = null
try {
  db = state?.initialized ? state.tasksDb ?? null : initialize()
  if (state) { state.tasksDb = db; state.initialized = true }
} catch { /* Fail closed: no production fallback for invalid emulator configuration. */ }
export function tasksForUser(userId: string) {
  if (!db) throw new Error('tasks-not-configured')
  return createTaskRepository(db, userId)
}
