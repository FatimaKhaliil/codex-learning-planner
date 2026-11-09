import http from 'node:http'
import { timingSafeEqual } from 'node:crypto'

export const EVALUATION_PROJECT = 'demo-learning-planner'
export const EVALUATION_UID = 'eval07-d0'
export const EVALUATION_EMAIL = 'eval07-d0@example.test'
export const EVALUATION_HOST = '127.0.0.1'
export const EVALUATION_PORTS = Object.freeze({ auth: 9099, firestore: 8081, hub: 4400 })
export const TASK_IDS = Object.freeze(['A01', 'A02', 'A03', 'A04', 'A05'])
const authBase = `/identitytoolkit.googleapis.com/v1/projects/${EVALUATION_PROJECT}/accounts`
const database = `projects/${EVALUATION_PROJECT}/databases/(default)`
const collection = `${database}/documents/users/${EVALUATION_UID}/tasks`
const authConfig = `/emulator/v1/projects/${EVALUATION_PROJECT}/config`
const coveragePath = `/emulator/v1/projects/${EVALUATION_PROJECT}:ruleCoverage`

export class EvaluationSetupError extends Error {
  constructor(code) {
    // Never copy remote bodies, request bodies, tokens or passwords into errors.
    super(code)
    this.name = 'EvaluationSetupError'
    this.code = code
  }
}

function requireValue(condition, code) {
  if (!condition) throw new EvaluationSetupError(code)
}

export function validateDateKey(value) {
  if (typeof value !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00.000Z`)
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value
}

export function berlinDateKey(now = new Date()) {
  requireValue(Number.isFinite(now.valueOf()), 'evaluation/invalid-date')
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const part = type => parts.find(item => item.type === type)?.value
  const result = `${part('year')}-${part('month')}-${part('day')}`
  requireValue(validateDateKey(result), 'evaluation/invalid-date')
  return result
}

function offsetDate(date, days) {
  const result = new Date(`${date}T12:00:00.000Z`)
  result.setUTCDate(result.getUTCDate() + days)
  const key = result.toISOString().slice(0, 10)
  requireValue(validateDateKey(key), 'evaluation/date-out-of-range')
  return key
}

export function createBaseline(date) {
  requireValue(validateDateKey(date), 'evaluation/invalid-date')
  const [year, month] = date.split('-').map(Number)
  const nextMonth = `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}-01`
  requireValue(validateDateKey(nextMonth), 'evaluation/date-out-of-range')
  const common = { description: '', subject: '', status: 'open' }
  return [
    { ...common, id: 'A01', title: 'E07 Mathematik – Integrale', subject: 'Mathematik', dueDate: offsetDate(date, 2), description: 'Übungsblatt bearbeiten.' },
    { ...common, id: 'A02', title: 'E07 Deutsch – Essay', subject: 'Deutsch', dueDate: offsetDate(date, 4), status: 'in-progress' },
    { ...common, id: 'A03', title: 'E07 Biologie – Zellen', subject: 'Biologie', dueDate: offsetDate(date, -1), status: 'done' },
    { ...common, id: 'A04', title: 'E07 Suchnadel – Physik', subject: 'Physik', dueDate: nextMonth },
    { ...common, id: 'A05', title: 'E07 Geschichte – Quellen', dueDate: offsetDate(date, 2) },
  ]
}

export function assertAccount(account) {
  requireValue(account !== null && typeof account === 'object' &&
    account.schemaVersion === 1 && account.projectId === EVALUATION_PROJECT &&
    account.uid === EVALUATION_UID && account.email === EVALUATION_EMAIL &&
    typeof account.password === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(account.password),
  'evaluation/invalid-local-account')
}

function assertPasswordBinding(user, account) {
  assertAccount(account)
  requireValue(typeof user.salt === 'string' && user.salt.length > 0 &&
    typeof user.passwordHash === 'string', 'evaluation/emulator-password-unverifiable')
  // This deliberately supports the documented-in-source Auth emulator fakeHash
  // format only. It is not a production password-hash verification mechanism.
  const expected = Buffer.from(`fakeHash:salt=${user.salt}:password=${account.password}`, 'utf8')
  const actual = Buffer.from(user.passwordHash, 'utf8')
  requireValue(expected.length === actual.length && timingSafeEqual(expected, actual),
    'evaluation/local-account-password-mismatch')
}

function documentId(name) {
  requireValue(typeof name === 'string' && name.startsWith(`${collection}/`), 'evaluation/out-of-scope-document')
  const id = name.slice(collection.length + 1)
  requireValue(id.length > 0 && !id.includes('/') && id !== '.' && id !== '..', 'evaluation/out-of-scope-document')
  return id
}

function assertRequestScope(request) {
  const { service, method, path, body } = request
  requireValue(Object.hasOwn(EVALUATION_PORTS, service) && typeof path === 'string' &&
    path.startsWith('/') && !path.startsWith('//') && !/[\r\n#]/.test(path), 'evaluation/out-of-scope-request')
  if (service === 'hub') {
    requireValue(method === 'GET' && path === '/emulators', 'evaluation/out-of-scope-request')
    return
  }
  if (service === 'auth') {
    if (method === 'GET' && (path === '/' || path === authConfig)) return
    requireValue(method === 'POST' && body && typeof body === 'object', 'evaluation/out-of-scope-request')
    if (path === `${authBase}:lookup`) {
      requireValue(JSON.stringify(body) === JSON.stringify({ localId: [EVALUATION_UID], email: [EVALUATION_EMAIL] }), 'evaluation/out-of-scope-account')
      return
    }
    requireValue(body.localId === EVALUATION_UID, 'evaluation/out-of-scope-account')
    if (path === authBase) {
      requireValue(body.email === EVALUATION_EMAIL && typeof body.password === 'string' &&
        Object.keys(body).sort().join(',') === 'email,localId,password', 'evaluation/out-of-scope-account')
      return
    }
    if (path === `${authBase}:update`) {
      requireValue(JSON.stringify(body) === JSON.stringify({ localId: EVALUATION_UID, deleteAttribute: ['DISPLAY_NAME'] }), 'evaluation/out-of-scope-account')
      return
    }
    throw new EvaluationSetupError('evaluation/out-of-scope-request')
  }
  if (method === 'GET' && path === coveragePath) return
  const listPath = `/v1/${collection}`
  if (method === 'GET' && path.startsWith(`${listPath}?`)) {
    const url = new URL(path, 'http://127.0.0.1')
    requireValue(url.pathname === listPath && [...url.searchParams.keys()].every(key => ['pageSize', 'pageToken'].includes(key)) &&
      url.searchParams.get('pageSize') === '1000', 'evaluation/out-of-scope-request')
    return
  }
  if (method === 'DELETE' && path.startsWith(`${listPath}/`)) {
    const suffix = path.slice(listPath.length + 1)
    requireValue(!suffix.includes('?'), 'evaluation/out-of-scope-document')
    let id
    try { id = decodeURIComponent(suffix) } catch { throw new EvaluationSetupError('evaluation/out-of-scope-document') }
    documentId(`${collection}/${id}`)
    return
  }
  if (method === 'POST' && path === `/v1/${database}/documents:commit`) {
    requireValue(Array.isArray(body?.writes) && body.writes.length === 1, 'evaluation/out-of-scope-write')
    const write = body.writes[0]
    requireValue(TASK_IDS.includes(documentId(write.update?.name)) && !write.delete && !write.transform &&
      write.currentDocument?.exists === false, 'evaluation/out-of-scope-write')
    return
  }
  throw new EvaluationSetupError('evaluation/out-of-scope-request')
}

export function createLoopbackTransport() {
  return async request => {
    assertRequestScope(request)
    const { service, method, path, body } = request
    const payload = body === undefined ? undefined : JSON.stringify(body)
    return new Promise((resolve, reject) => {
      const fail = code => reject(new EvaluationSetupError(code))
      // Native node:http uses neither HTTP(S)_PROXY nor redirects; the host and
      // ports cannot be supplied by environment variables, credentials or flags.
      const outgoing = http.request({ hostname: EVALUATION_HOST, family: 4,
        port: EVALUATION_PORTS[service], method, path, agent: false,
        headers: { Authorization: 'Bearer owner', Accept: 'application/json',
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}) },
      }, response => {
        let size = 0
        const chunks = []
        response.on('data', chunk => {
          size += chunk.length
          if (size > 8 * 1024 * 1024) { response.destroy(); fail('evaluation/response-too-large') }
          else chunks.push(chunk)
        })
        response.on('error', () => fail('evaluation/emulator-unavailable'))
        response.on('end', () => {
          if (response.statusCode < 200 || response.statusCode >= 300) return fail('evaluation/emulator-http-error')
          const raw = Buffer.concat(chunks).toString('utf8')
          try { resolve(raw ? JSON.parse(raw) : {}) } catch { fail('evaluation/invalid-emulator-response') }
        })
      })
      outgoing.setTimeout(3000, () => { outgoing.destroy(); fail('evaluation/emulator-timeout') })
      outgoing.on('error', () => fail('evaluation/emulator-unavailable'))
      outgoing.end(payload)
    })
  }
}

export function verifyBaseline(tasks, displayName, date) {
  const expected = createBaseline(date)
  requireValue(displayName === undefined || displayName === null, 'evaluation/display-name-not-empty')
  requireValue(tasks.length === expected.length && new Set(tasks.map(task => task.id)).size === expected.length,
    'evaluation/baseline-task-count-mismatch')
  for (const task of expected) {
    const actual = tasks.find(item => item.id === task.id)
    requireValue(actual && Object.entries(task).every(([key, value]) => actual[key] === value), 'evaluation/baseline-task-mismatch')
  }
  return { total: 5, open: 3, inProgress: 1, done: 1, notDone: 4 }
}

export function createEvaluationClient({ transport = createLoopbackTransport() } = {}) {
  const request = async value => { assertRequestScope(value); return transport(value) }
  async function checkEmulators() {
    const root = await request({ service: 'auth', method: 'GET', path: '/' })
    requireValue(root?.authEmulator?.ready === true && root.authEmulator.apiSpec === '/emulator/openapi.json', 'evaluation/auth-emulator-not-identified')
    const config = await request({ service: 'auth', method: 'GET', path: authConfig })
    requireValue(typeof config?.signIn?.allowDuplicateEmails === 'boolean' &&
      config.signIn.allowDuplicateEmails === false &&
      typeof config?.emailPrivacyConfig?.enableImprovedEmailPrivacy === 'boolean', 'evaluation/auth-emulator-config-mismatch')
    const coverage = await request({ service: 'firestore', method: 'GET', path: coveragePath })
    requireValue(coverage && typeof coverage === 'object' && !Array.isArray(coverage) &&
      !Object.hasOwn(coverage, 'error'), 'evaluation/firestore-emulator-not-identified')
    // No stable JSON coverage schema was verified. A positive Hub registry
    // check therefore accompanies coverage; an arbitrary {} is insufficient.
    const hub = await request({ service: 'hub', method: 'GET', path: '/emulators' })
    for (const name of ['auth', 'firestore']) requireValue(hub?.[name]?.name === name &&
      hub[name].host === EVALUATION_HOST && hub[name].port === EVALUATION_PORTS[name],
    'evaluation/emulator-registry-mismatch')
    // The emulator-only route fixes the project scope; it does not assert that
    // unrelated local processes or a machine controlled by an attacker are safe.
    return true
  }
  async function accountInfo(account) {
    const result = await request({ service: 'auth', method: 'POST', path: `${authBase}:lookup`,
      body: { localId: [EVALUATION_UID], email: [EVALUATION_EMAIL] } })
    requireValue(result?.kind === 'identitytoolkit#GetAccountInfoResponse' &&
      (result.users === undefined || Array.isArray(result.users)), 'evaluation/invalid-account-lookup')
    const users = result.users ?? []
    requireValue(users.length <= 1, 'evaluation/account-collision')
    if (users.length === 1) requireValue(users[0].localId === EVALUATION_UID && users[0].email === EVALUATION_EMAIL &&
      !users[0].disabled, 'evaluation/account-collision')
    if (users.length === 1 && account) assertPasswordBinding(users[0], account)
    return users[0] ?? null
  }
  async function mutation(value, exists, account) {
    // Revalidate both emulators and exact UID/email before EVERY remote write.
    assertRequestScope(value)
    await checkEmulators()
    const user = await accountInfo(account)
    requireValue(Boolean(user) === exists, 'evaluation/account-state-changed')
    return request(value)
  }
  async function listTasks(strict = true) {
    const tasks = []
    const tokens = new Set()
    let pageToken = ''
    do {
      requireValue(tokens.size < 100, 'evaluation/task-list-safety-limit')
      const query = new URLSearchParams({ pageSize: '1000', ...(pageToken ? { pageToken } : {}) })
      const page = await request({ service: 'firestore', method: 'GET', path: `/v1/${collection}?${query}` })
      requireValue(page && (page.documents === undefined || Array.isArray(page.documents)) &&
        (page.nextPageToken === undefined || typeof page.nextPageToken === 'string'), 'evaluation/invalid-task-list')
      for (const document of page.documents ?? []) {
        const id = documentId(document.name)
        if (strict) requireValue(document.fields && typeof document.fields === 'object' &&
          Object.keys(document.fields).sort().join(',') === 'createdAt,description,dueDate,status,subject,title,updatedAt',
        'evaluation/invalid-task-document')
        const task = { id }
        for (const key of ['title', 'description', 'subject', 'dueDate', 'status']) {
          if (strict) requireValue(typeof document.fields[key]?.stringValue === 'string', 'evaluation/invalid-task-document')
          task[key] = document.fields?.[key]?.stringValue
        }
        if (strict) requireValue(typeof document.fields.createdAt?.timestampValue === 'string' &&
          typeof document.fields.updatedAt?.timestampValue === 'string', 'evaluation/invalid-task-timestamps')
        tasks.push(task)
      }
      pageToken = page.nextPageToken ?? ''
      requireValue(!pageToken || !tokens.has(pageToken), 'evaluation/repeated-page-token')
      if (pageToken) tokens.add(pageToken)
    } while (pageToken)
    requireValue(new Set(tasks.map(task => task.id)).size === tasks.length, 'evaluation/duplicate-task-document')
    return tasks
  }
  async function verify(date, account) {
    assertAccount(account)
    await checkEmulators()
    const user = await accountInfo(account)
    requireValue(user, 'evaluation/account-missing')
    return verifyBaseline(await listTasks(), user.displayName, date)
  }
  async function inspect() {
    await checkEmulators()
    return { accountExists: Boolean(await accountInfo()) }
  }
  async function restore(mode, account, date, { requireAbsentAccount = false } = {}) {
    requireValue(mode === 'seed' || mode === 'reset', 'evaluation/invalid-mode')
    assertAccount(account)
    const baseline = createBaseline(date)
    await checkEmulators()
    let user = await accountInfo(account)
    requireValue(!requireAbsentAccount || !user, 'evaluation/account-already-exists-without-local-credentials')
    if (!user) {
      requireValue(mode === 'seed', 'evaluation/account-missing')
      const created = await mutation({ service: 'auth', method: 'POST', path: authBase,
        body: { localId: EVALUATION_UID, email: EVALUATION_EMAIL, password: account.password } }, false, account)
      requireValue(created?.localId === EVALUATION_UID && created.email === EVALUATION_EMAIL, 'evaluation/created-account-mismatch')
      user = await accountInfo(account)
      requireValue(user, 'evaluation/account-missing')
    }
    const existing = await listTasks(mode === 'seed')
    if (mode === 'seed' && existing.length > 0) {
      // A repeated seed verifies instead of silently replacing changed data.
      return verifyBaseline(existing, user.displayName, date)
    }
    for (const task of existing) {
      await mutation({ service: 'firestore', method: 'DELETE', path: `/v1/${collection}/${encodeURIComponent(task.id)}` }, true, account)
    }
    await mutation({ service: 'auth', method: 'POST', path: `${authBase}:update`,
      body: { localId: EVALUATION_UID, deleteAttribute: ['DISPLAY_NAME'] } }, true, account)
    for (const { id, ...task } of baseline) {
      await mutation({ service: 'firestore', method: 'POST', path: `/v1/${database}/documents:commit`,
        body: { writes: [{ update: { name: `${collection}/${id}`,
          fields: Object.fromEntries(Object.entries(task).map(([key, value]) => [key, { stringValue: value }])) },
        currentDocument: { exists: false }, updateTransforms: [
          { fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' },
          { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
        ] }] } }, true, account)
    }
    return verify(date, account)
  }
  return Object.freeze({ checkEmulators, inspect, verify, restore })
}
