import { collection, deleteDoc, doc, getDocsFromServer, limit, orderBy, query, runTransaction, serverTimestamp, startAfter, updateDoc } from 'firebase/firestore'
import type { Firestore, QueryDocumentSnapshot } from 'firebase/firestore'
import { normalizeTask } from './model.ts'
import type { Task, TaskInput, TaskStatus } from './model.ts'
export const TASK_PAGE_SIZE = 50
export interface TaskPage { tasks: Task[]; cursor: QueryDocumentSnapshot | null; hasMore: boolean }
export interface TaskRepository {
  list: (cursor?: QueryDocumentSnapshot | null) => Promise<TaskPage>
  create: (value: TaskInput, id: string) => Promise<void>
  newId: () => string
  update: (id: string, value: TaskInput) => Promise<void>
  setStatus: (id: string, status: TaskStatus) => Promise<void>
  remove: (id: string) => Promise<void>
}
function segment(value: string) { if (!value || value.includes('/')) throw new Error('invalid-path'); return value }
// The authenticated UID is supplied by AuthProvider, never by an editable form.
export function createTaskRepository(db: Firestore, userId: string): TaskRepository {
  const tasks = collection(db, 'users', segment(userId), 'tasks')
  const reference = (id: string) => doc(tasks, segment(id))
  return {
    async list(cursor) {
      const constraints = [orderBy('dueDate'), orderBy('__name__'), ...(cursor ? [startAfter(cursor)] : []), limit(TASK_PAGE_SIZE)]
      const snapshot = await getDocsFromServer(query(tasks, ...constraints))
      return { tasks: snapshot.docs.map((item) => ({ ...normalizeTask(item.data() as TaskInput), id: item.id })), cursor: snapshot.docs.at(-1) ?? null, hasMore: snapshot.size === TASK_PAGE_SIZE }
    },
    newId: () => doc(tasks).id,
    async create(value, id) {
      const data = normalizeTask(value)
      await runTransaction(db, async transaction => {
        const ref = reference(id)
        const existing = await transaction.get(ref)
        if (existing.exists()) {
          // A retry of an acknowledged-late create is idempotent, but cannot
          // overwrite an unrelated or subsequently modified document.
          const previous = existing.data()
          if (Object.entries(data).every(([key, item]) => previous[key] === item)) return
          throw new Error('create-conflict')
        }
        transaction.set(ref, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
      })
    },
    async update(id, value) { await updateDoc(reference(id), { ...normalizeTask(value), updatedAt: serverTimestamp() }) },
    async setStatus(id, status) {
      if (!['open', 'in-progress', 'done'].includes(status)) throw new Error('invalid-status')
      await updateDoc(reference(id), { status, updatedAt: serverTimestamp() })
    },
    async remove(id) { await deleteDoc(reference(id)) },
  }
}
