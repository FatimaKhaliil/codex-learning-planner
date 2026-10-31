import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { initializeApp, deleteApp } from 'firebase/app'
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth'
import { connectFirestoreEmulator, doc, getDoc, getDocs, collection, getFirestore, serverTimestamp, setDoc, updateDoc, deleteDoc, terminate } from 'firebase/firestore'
import { createTaskRepository } from '../src/tasks/repository.ts'
// Hard-coded demo project + loopback endpoints: this test cannot target production.
const projectId = 'demo-learning-planner'
const apps = [0, 1].map(i => initializeApp({ projectId, apiKey: 'emulator-only', authDomain: `${projectId}.firebaseapp.com` }, `tasks-${i}-${randomUUID()}`))
const clients = apps.map(app => {
  const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  const db = getFirestore(app); connectFirestoreEmulator(db, '127.0.0.1', 8081)
  return { auth, db }
})
const checks: string[] = []
const denied = (promise: Promise<unknown>) => assert.rejects(promise, (error: { code?: string }) => error.code === 'permission-denied')
try {
  // Fail fast rather than allowing SDK connection retries to obscure a missing emulator.
  for (const port of [9099, 8081]) await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(3000) })
  const [a, b] = clients
  const userA = (await createUserWithEmailAndPassword(a.auth, `a-${randomUUID()}@example.test`, randomUUID())).user
  const userB = (await createUserWithEmailAndPassword(b.auth, `b-${randomUUID()}@example.test`, randomUUID())).user
  const repo = createTaskRepository(a.db, userA.uid)
  const other = createTaskRepository(b.db, userB.uid)
  const input = { title: 'Mathe', dueDate: '2026-11-01', description: '', subject: '', status: 'open' as const }
  const id = repo.newId()
  await repo.create(input, id)
  assert.equal((await repo.list()).tasks.find(task => task.id === id)?.title, 'Mathe')
  assert.equal((await getDoc(doc(a.db, 'users', userA.uid, 'tasks', id))).data()?.createdAt?.toMillis() > 0, true)
  await repo.create(input, id)
  assert.equal((await repo.list()).tasks.length, 1)
  checks.push('create/read with server timestamps and idempotent retry')
  await repo.update(id, { ...input, title: 'Analysis', description: 'Notiz', subject: 'Mathematik' })
  await repo.setStatus(id, 'in-progress'); assert.equal((await repo.list()).tasks[0].status, 'in-progress')
  await repo.setStatus(id, 'done'); assert.equal((await repo.list()).tasks[0].status, 'done')
  checks.push('edit and both status transitions persist')
  assert.equal((await other.list()).tasks.length, 0)
  const foreign = doc(b.db, 'users', userA.uid, 'tasks', id)
  await denied(getDoc(foreign)); await denied(getDocs(collection(b.db, 'users', userA.uid, 'tasks')))
  await denied(setDoc(doc(b.db, 'users', userA.uid, 'tasks', 'foreign'), { ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }))
  await denied(updateDoc(foreign, { title: 'Stolen', updatedAt: serverTimestamp() })); await denied(deleteDoc(foreign))
  checks.push('cross-user read/list/create/update/delete denied')
  const own = doc(a.db, 'users', userA.uid, 'tasks', id)
  for (const invalid of [{ title: '' }, { status: 'invalid' }, { dueDate: '' }, { subject: 's'.repeat(101) }, { priority: 'high' }, { createdAt: serverTimestamp() }]) await denied(updateDoc(own, { ...invalid, updatedAt: serverTimestamp() }))
  checks.push('rules reject invalid fields, extra keys and timestamp tampering')
  await signOut(b.auth)
  await denied(getDoc(foreign)); await denied(setDoc(doc(b.db, 'users', userB.uid, 'tasks', 'anonymous'), { ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }))
  checks.push('unauthenticated access denied')
  await repo.remove(id); assert.equal((await getDoc(own)).exists(), false)
  checks.push('delete persists')
  // Exercise a real query cursor across the page boundary, with identical due dates.
  const ids = Array.from({ length: 51 }, () => repo.newId())
  await Promise.all(ids.map(taskId => repo.create(input, taskId)))
  const first = await repo.list(); const second = await repo.list(first.cursor)
  assert.equal(first.tasks.length, 50); assert.equal(second.tasks.length, 1)
  assert.equal(new Set([...first.tasks, ...second.tasks].map(task => task.id)).size, 51)
  await Promise.all(ids.map(taskId => repo.remove(taskId)))
  checks.push('pagination has no missing or duplicate documents')
  console.log(JSON.stringify({ passed: checks }, null, 2))
} finally {
  await Promise.all(clients.map(client => terminate(client.db)))
  await Promise.all(apps.map(app => deleteApp(app)))
}
