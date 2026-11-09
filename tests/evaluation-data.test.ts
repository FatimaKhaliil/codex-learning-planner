import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import http from 'node:http'
import { EventEmitter } from 'node:events'
import test from 'node:test'
import {
  assertAccount, berlinDateKey, createBaseline, createEvaluationClient,
  createLoopbackTransport, EVALUATION_EMAIL, EVALUATION_PROJECT, EVALUATION_UID,
  EvaluationSetupError, TASK_IDS, validateDateKey, verifyBaseline,
} from '../scripts/evaluation-data-core.mjs'

// All client tests below inject an isolated in-memory TRANSPORT DOUBLE. They do
// not connect to Firebase, exercise Security Rules or prove SDK persistence.
const project = EVALUATION_PROJECT
const uid = EVALUATION_UID
const authBase = `/identitytoolkit.googleapis.com/v1/projects/${project}/accounts`
const db = `projects/${project}/databases/(default)`
const collection = `${db}/documents/users/${uid}/tasks`
const date = '2026-12-30'
const account = () => ({ schemaVersion: 1, projectId: project, uid,
  email: EVALUATION_EMAIL, password: randomBytes(32).toString('base64url') })
type Request = { service: string; method: string; path: string; body?: any }
type User = { localId: string; email: string; displayName?: string; disabled?: boolean; salt?: string; passwordHash?: string }

function remoteTask(task: Record<string, any>) {
  const { id, ...fields } = task
  return { name: `${collection}/${id}`, fields: {
    ...Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, { stringValue: value }])),
    createdAt: { timestampValue: '2026-01-01T00:00:00.000Z' },
    updatedAt: { timestampValue: '2026-01-01T00:00:00.000Z' },
  } }
}

function isolatedTransport() {
  const credentials = account()
  const requests: Request[] = []
  const documents = new Map<string, any>()
  const users: User[] = []
  const state = { firestoreReady: true, authReady: true, coverageError: false,
    registryReady: true, duplicateEmails: false, failAfterWrites: Infinity, pageSize: Infinity, writes: 0 }
  const isWrite = (request: Request) => request.method === 'DELETE' ||
    (request.method === 'POST' && !request.path.endsWith(':lookup'))
  const transport = async (request: Request) => {
    requests.push(structuredClone(request))
    if (request.service === 'auth' && request.method === 'GET' && request.path === '/') {
      return { authEmulator: { ready: state.authReady, apiSpec: '/emulator/openapi.json' } }
    }
    if (request.path.endsWith('/config')) return { signIn: { allowDuplicateEmails: state.duplicateEmails },
      emailPrivacyConfig: { enableImprovedEmailPrivacy: false } }
    if (request.service === 'hub') return {
      auth: { name: 'auth', host: '127.0.0.1', port: 9099 },
      firestore: { name: 'firestore', host: '127.0.0.1', port: state.registryReady ? 8081 : 80 },
    }
    if (request.path.endsWith(':ruleCoverage')) {
      if (!state.firestoreReady || state.writes >= state.failAfterWrites) throw new EvaluationSetupError('evaluation/emulator-unavailable')
      return state.coverageError ? { error: { message: 'not an emulator' } } : {}
    }
    if (request.path === `${authBase}:lookup`) return { kind: 'identitytoolkit#GetAccountInfoResponse',
      ...(users.length ? { users: structuredClone(users).map(user => ({
        salt: 'fakeSalt-local-unit-test',
        passwordHash: `fakeHash:salt=fakeSalt-local-unit-test:password=${credentials.password}`,
        ...user,
      })) } : {}) }
    if (isWrite(request)) state.writes++
    if (request.path === authBase) {
      users.push({ localId: request.body.localId, email: request.body.email })
      return { kind: 'identitytoolkit#SignupNewUserResponse', localId: uid, email: EVALUATION_EMAIL }
    }
    if (request.path === `${authBase}:update`) { delete users[0].displayName; return { localId: uid } }
    if (request.method === 'DELETE') { documents.delete(`${collection}/${decodeURIComponent(request.path.split('/').at(-1)!)}`); return {} }
    if (request.path.endsWith('/documents:commit')) {
      const write = request.body.writes[0]
      assert.equal(write.currentDocument.exists, false)
      assert.equal(documents.has(write.update.name), false)
      assert.deepEqual(write.updateTransforms, [
        { fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' },
        { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
      ])
      documents.set(write.update.name, { name: write.update.name, fields: { ...write.update.fields,
        createdAt: { timestampValue: '2026-01-01T00:00:00.000Z' }, updatedAt: { timestampValue: '2026-01-01T00:00:00.000Z' } } })
      return { commitTime: '2026-01-01T00:00:00.000Z' }
    }
    if (request.method === 'GET' && request.service === 'firestore') {
      const query = new URL(request.path, 'http://127.0.0.1').searchParams
      const start = Number(query.get('pageToken') ?? 0)
      const own = [...documents.values()]
      const page = own.slice(start, start + state.pageSize)
      return { documents: page, ...(start + page.length < own.length ? { nextPageToken: String(start + page.length) } : {}) }
    }
    throw new Error('unexpected isolated transport operation')
  }
  return { transport, requests, documents, users, state, isWrite, credentials }
}

test('D0 has the exact five planned records, stable IDs and status counts', () => {
  const baseline = createBaseline('2026-11-05')
  assert.deepEqual(baseline, [
    { id: 'A01', title: 'E07 Mathematik – Integrale', subject: 'Mathematik', dueDate: '2026-11-07', status: 'open', description: 'Übungsblatt bearbeiten.' },
    { id: 'A02', title: 'E07 Deutsch – Essay', subject: 'Deutsch', dueDate: '2026-11-09', status: 'in-progress', description: '' },
    { id: 'A03', title: 'E07 Biologie – Zellen', subject: 'Biologie', dueDate: '2026-11-04', status: 'done', description: '' },
    { id: 'A04', title: 'E07 Suchnadel – Physik', subject: 'Physik', dueDate: '2026-12-01', status: 'open', description: '' },
    { id: 'A05', title: 'E07 Geschichte – Quellen', subject: '', dueDate: '2026-11-07', status: 'open', description: '' },
  ])
  assert.deepEqual(baseline.map(task => task.id), TASK_IDS)
  assert.deepEqual(verifyBaseline(baseline, null, '2026-11-05'), { total: 5, open: 3, inProgress: 1, done: 1, notDone: 4 })
  baseline[0].title = 'changed returned copy'
  assert.equal(createBaseline('2026-11-05')[0].title, 'E07 Mathematik – Integrale')
})

test('Berlin setup dates and calendar arithmetic handle UTC midnight, DST, leap days and year change', () => {
  assert.equal(berlinDateKey(new Date('2026-11-05T23:30:00Z')), '2026-11-06')
  assert.equal(berlinDateKey(new Date('2026-06-05T22:30:00Z')), '2026-06-06')
  assert.deepEqual(createBaseline('2026-12-30').map(task => task.dueDate), ['2027-01-01', '2027-01-03', '2026-12-29', '2027-01-01', '2027-01-01'])
  assert.equal(createBaseline('2024-02-27')[0].dueDate, '2024-02-29')
  assert.equal(createBaseline('2026-03-28')[0].dueDate, '2026-03-30')
  assert.equal(createBaseline('2026-10-24')[0].dueDate, '2026-10-26')
  for (const invalid of ['2026-02-29', '2024-02-30', '1900-02-29', '2026-2-03', '2026-11-05Z', ' 2026-11-05', '0999-12-31']) {
    assert.equal(validateDateKey(invalid), false)
    assert.throws(() => createBaseline(invalid), { code: 'evaluation/invalid-date' })
  }
  assert.equal(validateDateKey('2000-02-29'), true)
  assert.throws(() => createBaseline('9999-12-01'), { code: 'evaluation/date-out-of-range' })
  assert.throws(() => createBaseline('1000-01-01'), { code: 'evaluation/date-out-of-range' })
})

test('credentials are accepted only for the fixed project, UID, email and a nontrivial random password', () => {
  const value = account()
  assert.doesNotThrow(() => assertAccount(value))
  for (const wrong of [{ ...value, projectId: 'other' }, { ...value, uid: 'other' },
    { ...value, email: 'other@example.test' }, { ...value, password: '' }, { ...value, password: 'fixed-short' }, null]) {
    assert.throws(() => assertAccount(wrong), { code: 'evaluation/invalid-local-account' })
  }
})

test('isolated seed creates exactly the scoped account and D0 with a fresh safety preflight before each write', async () => {
  const mock = isolatedTransport()
  const client = createEvaluationClient({ transport: mock.transport })
  assert.deepEqual(await client.restore('seed', mock.credentials, date), { total: 5, open: 3, inProgress: 1, done: 1, notDone: 4 })
  assert.equal(mock.users.length, 1)
  assert.equal(mock.documents.size, 5)
  assert.equal(mock.state.writes, 7)
  for (let index = 0; index < mock.requests.length; index++) {
    if (!mock.isWrite(mock.requests[index])) continue
    const preceding = mock.requests.slice(index - 5, index)
    assert.deepEqual(preceding.map(request => [request.service, request.method, request.path]), [
      ['auth', 'GET', '/'], ['auth', 'GET', `/emulator/v1/projects/${project}/config`],
      ['firestore', 'GET', `/emulator/v1/projects/${project}:ruleCoverage`],
      ['hub', 'GET', '/emulators'], ['auth', 'POST', `${authBase}:lookup`],
    ])
  }
  assert.equal(mock.requests.some(request => request.path.includes('signIn')), false)
})

test('isolated reset removes extra tasks only from the fixed account, restores five tasks and unsets displayName', async () => {
  const mock = isolatedTransport()
  mock.users.push({ localId: uid, email: EVALUATION_EMAIL, displayName: 'Changed' })
  for (const task of createBaseline(date)) {
    const document = remoteTask({ ...task, title: 'Mutated' })
    mock.documents.set(document.name, document)
  }
  mock.documents.set(`${collection}/extra`, { name: `${collection}/extra`, fields: { arbitrary: { stringValue: 'synthetic' } } })
  const client = createEvaluationClient({ transport: mock.transport })
  await client.restore('reset', mock.credentials, date)
  assert.equal(mock.documents.size, 5)
  assert.equal(Object.hasOwn(mock.users[0], 'displayName'), false)
  assert.equal(mock.requests.filter(request => request.method === 'DELETE').length, 6)
  assert.ok(mock.requests.filter(request => request.method === 'DELETE').every(request => request.path.startsWith(`/v1/${collection}/`)))
})

test('verify and a repeated valid seed are read-only; a changed seed is not silently overwritten', async () => {
  const mock = isolatedTransport()
  const client = createEvaluationClient({ transport: mock.transport })
  const credentials = mock.credentials
  await client.restore('seed', credentials, date)
  mock.requests.length = 0
  await client.verify(date, credentials)
  await client.restore('seed', credentials, date)
  assert.equal(mock.requests.some(mock.isWrite), false)
  mock.documents.get(`${collection}/A01`).fields.title.stringValue = 'Changed'
  await assert.rejects(client.restore('seed', credentials, date), { code: 'evaluation/baseline-task-mismatch' })
  assert.equal(mock.requests.some(mock.isWrite), false)
})

test('Firestore absence, failed emulator identification and collisions block before any Auth write', async () => {
  for (const variation of ['firestore-unavailable', 'coverage-error', 'auth-not-ready', 'registry-mismatch', 'duplicate-emails', 'different-uid', 'different-email', 'two-users']) {
    const mock = isolatedTransport()
    if (variation === 'firestore-unavailable') mock.state.firestoreReady = false
    if (variation === 'coverage-error') mock.state.coverageError = true
    if (variation === 'auth-not-ready') mock.state.authReady = false
    if (variation === 'registry-mismatch') mock.state.registryReady = false
    if (variation === 'duplicate-emails') mock.state.duplicateEmails = true
    if (variation === 'different-uid') mock.users.push({ localId: 'foreign', email: EVALUATION_EMAIL })
    if (variation === 'different-email') mock.users.push({ localId: uid, email: 'foreign@example.test' })
    if (variation === 'two-users') mock.users.push({ localId: uid, email: EVALUATION_EMAIL }, { localId: 'foreign', email: EVALUATION_EMAIL })
    const client = createEvaluationClient({ transport: mock.transport })
    await assert.rejects(client.restore('seed', mock.credentials, date), error => error instanceof EvaluationSetupError)
    assert.equal(mock.requests.some(mock.isWrite), false, variation)
  }
})

test('existing account credentials are checked without login and mismatches never cause writes or secret output', async () => {
  const mock = isolatedTransport()
  const client = createEvaluationClient({ transport: mock.transport })
  await client.restore('seed', mock.credentials, date)
  mock.requests.length = 0
  const wrongCredentials = { ...mock.credentials, password: randomBytes(32).toString('base64url') }
  for (const action of [() => client.verify(date, wrongCredentials), () => client.restore('reset', wrongCredentials, date)]) {
    await assert.rejects(action, error => {
      assert.ok(error instanceof EvaluationSetupError)
      assert.equal(error.code, 'evaluation/local-account-password-mismatch')
      assert.equal(String(error).includes(mock.credentials.password), false)
      assert.equal(String(error).includes(wrongCredentials.password), false)
      return true
    })
  }
  assert.equal(mock.requests.some(mock.isWrite), false)
  mock.users[0].passwordHash = 'future-unknown-hash-format'
  await assert.rejects(client.verify(date, mock.credentials), { code: 'evaluation/local-account-password-mismatch' })
  mock.users[0].salt = ''
  await assert.rejects(client.verify(date, mock.credentials), { code: 'evaluation/emulator-password-unverifiable' })
})

test('reset processes more than 50 account tasks across pages instead of leaving extra records behind', async () => {
  const mock = isolatedTransport()
  mock.users.push({ localId: uid, email: EVALUATION_EMAIL })
  for (let index = 0; index < 73; index++) {
    const document = remoteTask({ ...createBaseline(date)[0], id: `extra-${index}` })
    mock.documents.set(document.name, document)
  }
  mock.state.pageSize = 19
  await createEvaluationClient({ transport: mock.transport }).restore('reset', mock.credentials, date)
  assert.equal(mock.requests.filter(request => request.method === 'DELETE').length, 73)
  assert.deepEqual([...mock.documents.keys()].map(name => name.split('/').at(-1)), [...TASK_IDS])
})

test('losing Firestore readiness after a write prevents the next mutation', async () => {
  const mock = isolatedTransport()
  mock.state.failAfterWrites = 1
  await assert.rejects(createEvaluationClient({ transport: mock.transport }).restore('seed', mock.credentials, date), { code: 'evaluation/emulator-unavailable' })
  assert.equal(mock.state.writes, 1)
  assert.equal(mock.documents.size, 0)
})

test('reset missing account and seed with unowned local credentials refuse to modify data', async () => {
  const mock = isolatedTransport()
  const client = createEvaluationClient({ transport: mock.transport })
  await assert.rejects(client.restore('reset', mock.credentials, date), { code: 'evaluation/account-missing' })
  mock.users.push({ localId: uid, email: EVALUATION_EMAIL })
  await assert.rejects(client.restore('seed', mock.credentials, date, { requireAbsentAccount: true }),
    { code: 'evaluation/account-already-exists-without-local-credentials' })
  assert.equal(mock.state.writes, 0)
})

test('pagination verifies the full baseline and rejects unexpected document scopes and fields', async () => {
  const mock = isolatedTransport()
  mock.users.push({ localId: uid, email: EVALUATION_EMAIL })
  for (const task of createBaseline(date)) { const document = remoteTask(task); mock.documents.set(document.name, document) }
  mock.state.pageSize = 2
  const client = createEvaluationClient({ transport: mock.transport })
  await client.verify(date, mock.credentials)
  assert.equal(mock.requests.filter(request => request.path.includes('pageToken=')).length, 2)
  mock.documents.get(`${collection}/A01`).fields.priority = { stringValue: 'unexpected' }
  await assert.rejects(client.verify(date, mock.credentials), { code: 'evaluation/invalid-task-document' })
  delete mock.documents.get(`${collection}/A01`).fields.priority
  mock.documents.get(`${collection}/A01`).name = `${db}/documents/users/foreign/tasks/A01`
  await assert.rejects(client.restore('reset', mock.credentials, date), { code: 'evaluation/out-of-scope-document' })
  assert.equal(mock.state.writes, 0)
})

test('transport rejects non-loopback destinations, global deletes and foreign project/UID paths without HTTP', async () => {
  const transport = createLoopbackTransport()
  for (const request of [
    { service: 'https://example.test', method: 'GET', path: '/' },
    { service: 'auth', method: 'GET', path: '//example.test/' },
    { service: 'auth', method: 'GET', path: 'http://example.test/' },
    { service: 'auth', method: 'DELETE', path: `/emulator/v1/projects/${project}/accounts` },
    { service: 'firestore', method: 'DELETE', path: `/emulator/v1/projects/${project}/databases/(default)/documents` },
    { service: 'firestore', method: 'DELETE', path: `/v1/${db}/documents/users/foreign/tasks/A01` },
    { service: 'firestore', method: 'DELETE', path: `/v1/${collection}/a%2Fb` },
    { service: 'auth', method: 'POST', path: authBase, body: { localId: 'foreign', email: EVALUATION_EMAIL, password: account().password } },
    { service: 'auth', method: 'POST', path: `/identitytoolkit.googleapis.com/v1/projects/foreign/accounts`, body: { localId: uid } },
  ]) await assert.rejects(transport(request), error => error instanceof EvaluationSetupError)
})

test('native HTTP transport fixes IPv4/ports, never follows redirects, and suppresses remote secrets', async () => {
  const original = http.request
  let calls = 0
  const secret = randomBytes(32).toString('base64url')
  http.request = ((options: any, callback: any) => {
    calls++
    assert.equal(options.hostname, '127.0.0.1')
    assert.equal(options.family, 4)
    assert.equal(options.port, 9099)
    assert.equal(options.agent, false)
    const outgoing = new EventEmitter() as any
    outgoing.setTimeout = () => {}
    outgoing.end = () => queueMicrotask(() => {
      const response = new EventEmitter() as any
      response.statusCode = 302
      response.headers = { location: `https://example.test/${secret}` }
      callback(response)
      response.emit('data', Buffer.from(JSON.stringify({ password: secret })))
      response.emit('end')
    })
    return outgoing
  }) as any
  try {
    await assert.rejects(createLoopbackTransport()({ service: 'auth', method: 'GET', path: '/' }), error => {
      assert.ok(error instanceof EvaluationSetupError)
      assert.equal(error.code, 'evaluation/emulator-http-error')
      assert.equal(String(error).includes(secret), false)
      return true
    })
    assert.equal(calls, 1)
  } finally { http.request = original }
})
