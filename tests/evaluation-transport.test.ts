import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import http from 'node:http'
import test from 'node:test'
import type { TestContext } from 'node:test'
import {
  createLoopbackTransport, EVALUATION_EMAIL, EVALUATION_PORTS,
  EVALUATION_PROJECT, EVALUATION_REQUEST_TIMEOUT_MS, EVALUATION_UID,
  EvaluationSetupError,
} from '../scripts/evaluation-data-core.mjs'

// Deterministic transport doubles and virtual timers only. No sockets, Firebase
// requests, account files or real credentials are used by these regressions.
const authBase = `/identitytoolkit.googleapis.com/v1/projects/${EVALUATION_PROJECT}/accounts`
const database = `projects/${EVALUATION_PROJECT}/databases/(default)`
const collection = `${database}/documents/users/${EVALUATION_UID}/tasks`
const ready = { service: 'auth', method: 'GET', path: '/' }

function fixture(t: TestContext, destroyError?: Error) {
  const calls: any[] = []
  const events: any[] = []
  t.mock.timers.enable({ apis: ['setTimeout'] })
  t.after(() => t.mock.timers.reset())
  t.mock.method(http, 'request', (options: any, callback: any) => {
    const outgoing = new EventEmitter() as any
    outgoing.destroyCount = 0
    outgoing.destroy = () => {
      outgoing.destroyCount++
      if (destroyError) outgoing.emit('error', destroyError)
    }
    outgoing.end = (payload: unknown) => { outgoing.payload = payload }
    const call = { options, outgoing, callback }
    calls.push(call)
    return outgoing
  })
  const response = (call = calls.at(-1), status = 200) => {
    const incoming = new EventEmitter() as any
    incoming.statusCode = status
    incoming.complete = false
    incoming.destroy = () => { incoming.emit('close') }
    call.callback(incoming)
    return incoming
  }
  const finish = (value: unknown = {}, call = calls.at(-1)) => {
    const incoming = response(call)
    incoming.emit('data', Buffer.from(JSON.stringify(value)))
    incoming.complete = true
    incoming.emit('end')
    incoming.emit('close')
  }
  return { calls, events, response, finish,
    transport: createLoopbackTransport({ onDiagnostic: (event: unknown) => events.push(event) }) }
}

test('one 3000ms deadline bounds socket assignment, connection, headers and stalled response bodies', async t => {
  assert.equal(EVALUATION_REQUEST_TIMEOUT_MS, 3000)
  for (const phase of ['waiting-socket', 'connecting', 'waiting-headers', 'reading-response']) {
    await t.test(phase, async child => {
      const mock = fixture(child)
      const pending = mock.transport(ready)
      if (phase === 'connecting' || phase === 'waiting-headers') {
        const socket = new EventEmitter() as any
        socket.connecting = phase === 'connecting'
        mock.calls[0].outgoing.emit('socket', socket)
      }
      if (phase === 'reading-response') mock.response()
      const rejected = assert.rejects(pending, (error: any) => {
        assert.ok(error instanceof EvaluationSetupError)
        assert.equal(error.code, 'evaluation/emulator-timeout')
        assert.equal(error.diagnostic.phase, phase)
        assert.equal(error.diagnostic.step, 'auth-ready')
        assert.equal(error.diagnostic.endpoint, 'http://127.0.0.1:9099/')
        assert.equal(error.diagnostic.timeoutMs, 3000)
        assert.equal(error.diagnostic.status, phase === 'reading-response' ? 200 : null)
        return true
      })
      child.mock.timers.tick(2999)
      assert.equal(mock.calls[0].outgoing.destroyCount, 0)
      child.mock.timers.tick(1)
      await rejected
      assert.equal(mock.calls[0].outgoing.destroyCount, 1)
      assert.deepEqual(mock.events.map(event => event.event), ['request-start', 'request-failed'])
    })
  }
})

test('partial response activity cannot extend the total deadline or produce late success', async t => {
  const mock = fixture(t)
  const pending = mock.transport(ready)
  const incoming = mock.response()
  const rejected = assert.rejects(pending, (error: any) => {
    assert.equal(error.code, 'evaluation/emulator-timeout')
    assert.equal(error.diagnostic.receivedBytes, Buffer.byteLength('{"publicTest":true'))
    assert.equal(error.diagnostic.phase, 'reading-response')
    return true
  })
  incoming.emit('data', Buffer.from('{"publicTest":'))
  t.mock.timers.tick(1700)
  incoming.emit('data', Buffer.from('true'))
  t.mock.timers.tick(1300)
  await rejected
  incoming.emit('data', Buffer.from('}'))
  incoming.complete = true
  incoming.emit('end')
  t.mock.timers.tick(10000)
  assert.deepEqual(mock.events.map(event => event.event), ['request-start', 'request-failed'])
})

test('completed and failed requests cancel their deadline and emit exactly one terminal event', async t => {
  const mock = fixture(t)
  const successful = mock.transport(ready)
  mock.finish({ publicTest: true })
  assert.deepEqual(await successful, { publicTest: true })
  t.mock.timers.tick(6000)
  assert.equal(mock.calls[0].outgoing.destroyCount, 0)
  const failed = mock.transport(ready)
  const rejected = assert.rejects(failed, (error: any) => {
    assert.equal(error.code, 'evaluation/emulator-unavailable')
    assert.equal(error.diagnostic.networkCode, 'ECONNREFUSED')
    return true
  })
  mock.calls[1].outgoing.emit('error', Object.assign(new Error('not exported'), { code: 'ECONNREFUSED' }))
  await rejected
  t.mock.timers.tick(6000)
  assert.equal(mock.calls[1].outgoing.destroyCount, 1)
  assert.deepEqual(mock.events.map(event => [event.request, event.event]), [
    [1, 'request-start'], [1, 'request-complete'], [2, 'request-start'], [2, 'request-failed'],
  ])
})

test('synchronous destroy errors cannot replace a timeout or cause duplicate failure diagnostics', async t => {
  const mock = fixture(t, Object.assign(new Error('private native error'), { code: 'ECONNRESET' }))
  const pending = mock.transport(ready)
  const rejected = assert.rejects(pending, (error: any) => {
    assert.equal(error.code, 'evaluation/emulator-timeout')
    assert.equal(Object.hasOwn(error.diagnostic, 'networkCode'), false)
    return true
  })
  t.mock.timers.tick(3000)
  await rejected
  assert.equal(mock.calls[0].outgoing.destroyCount, 1)
  assert.equal(mock.events.filter(event => event.event === 'request-failed').length, 1)
})

test('aborted or incomplete response close fails promptly and never leaves a live deadline', async t => {
  for (const event of ['aborted', 'close']) {
    await t.test(event, async child => {
      const mock = fixture(child)
      const pending = mock.transport(ready)
      const incoming = mock.response()
      const rejected = assert.rejects(pending, { code: 'evaluation/emulator-unavailable' })
      incoming.emit('data', Buffer.from('{'))
      incoming.emit(event)
      await rejected
      incoming.emit('error', Object.assign(new Error('not exported'), { code: 'ECONNRESET' }))
      child.mock.timers.tick(10000)
      assert.equal(mock.events.filter(item => item.event === 'request-failed').length, 1)
    })
  }
})

test('diagnostics redact request bodies, task IDs, page tokens, response data and native error text', async t => {
  const mock = fixture(t)
  const secret = 'private-password-token-task-identifier'
  const cases = [
    { service: 'auth', method: 'POST', path: authBase,
      body: { localId: EVALUATION_UID, email: EVALUATION_EMAIL, password: secret } },
    { service: 'firestore', method: 'GET', path: `/v1/${collection}?pageSize=1000&pageToken=${secret}` },
    { service: 'firestore', method: 'DELETE', path: `/v1/${collection}/${secret}` },
  ]
  for (const request of cases) {
    const pending = mock.transport(request)
    const rejected = assert.rejects(pending, (error: any) => {
      const serialized = JSON.stringify({ error, events: mock.events }) + String(error)
      for (const forbidden of [secret, EVALUATION_UID, EVALUATION_EMAIL, 'Authorization', 'passwordHash', 'pageToken']) {
        assert.equal(serialized.includes(forbidden), false, forbidden)
      }
      assert.equal(Object.hasOwn(error.diagnostic, 'networkCode'), false)
      assert.ok(Object.isFrozen(error.diagnostic))
      return true
    })
    const incoming = mock.response(undefined, 500)
    incoming.emit('data', Buffer.from(JSON.stringify({ passwordHash: secret, token: secret })))
    incoming.emit('error', Object.assign(new Error(secret), { code: secret }))
    await rejected
  }
})

test('POST framing retains exact UTF-8 byte length and payload while exposing no task contents', async t => {
  const mock = fixture(t)
  const body = { writes: [{ update: { name: `${collection}/A01`,
    fields: { title: { stringValue: 'Übungsblatt 🍀 – keine Diagnoseausgabe' } } }, currentDocument: { exists: false } }] }
  const pending = mock.transport({ service: 'firestore', method: 'POST', path: `/v1/${database}/documents:commit`, body })
  const call = mock.calls[0]
  assert.equal(call.outgoing.payload, JSON.stringify(body))
  assert.equal(call.options.headers['Content-Length'], Buffer.byteLength(call.outgoing.payload))
  assert.ok(Buffer.byteLength(call.outgoing.payload) > call.outgoing.payload.length)
  assert.equal(call.options.headers['Content-Type'], 'application/json')
  mock.finish({ publicCommit: true })
  await pending
  assert.equal(JSON.stringify(mock.events).includes('Übungsblatt'), false)
  assert.equal(mock.events[0].step, 'task-create')
})

test('allowed request types retain fixed IPv4 endpoints and correlate safe operation templates', async t => {
  const mock = fixture(t)
  const requests = [
    { ...ready, step: 'auth-ready' },
    { service: 'auth', method: 'GET', path: `/emulator/v1/projects/${EVALUATION_PROJECT}/config`, step: 'auth-config' },
    { service: 'auth', method: 'POST', path: `${authBase}:lookup`,
      body: { localId: [EVALUATION_UID], email: [EVALUATION_EMAIL] }, step: 'account-lookup' },
    { service: 'auth', method: 'POST', path: `${authBase}:update`,
      body: { localId: EVALUATION_UID, deleteAttribute: ['DISPLAY_NAME'] }, step: 'account-clear-name' },
    { service: 'firestore', method: 'GET', path: `/emulator/v1/projects/${EVALUATION_PROJECT}:ruleCoverage`, step: 'firestore-coverage' },
    { service: 'hub', method: 'GET', path: '/emulators', step: 'emulator-registry' },
  ]
  for (const request of requests) {
    const pending = mock.transport(request)
    const options = mock.calls.at(-1).options
    assert.equal(options.hostname, '127.0.0.1')
    assert.equal(options.family, 4)
    assert.equal(options.port, EVALUATION_PORTS[request.service])
    assert.equal(options.agent, false)
    assert.equal(options.path, request.path)
    mock.finish()
    await pending
    const event = mock.events.at(-1)
    assert.equal(event.step, request.step)
    assert.equal(event.request, mock.calls.length)
    assert.equal(event.method, request.method)
    assert.ok(event.endpoint.startsWith(`http://127.0.0.1:${options.port}/`))
  }
  const before = mock.calls.length
  await assert.rejects(mock.transport({ service: 'auth', method: 'GET', path: 'https://private.invalid/token' }),
    { code: 'evaluation/out-of-scope-request' })
  assert.equal(mock.calls.length, before)
  assert.equal(mock.events.length, before * 2)
})

test('a failing diagnostic renderer cannot change success or failure semantics', async t => {
  const mock = fixture(t)
  let renderCalls = 0
  const transport = createLoopbackTransport({ onDiagnostic: () => {
    renderCalls++
    throw new Error('private-renderer-text')
  } })
  const successful = transport(ready)
  mock.finish({ publicTest: true })
  assert.deepEqual(await successful, { publicTest: true })
  const failed = transport(ready)
  const rejected = assert.rejects(failed, (error: any) => {
    assert.equal(error.code, 'evaluation/emulator-timeout')
    assert.equal(String(error).includes('private-renderer-text'), false)
    return true
  })
  t.mock.timers.tick(3000)
  await rejected
  assert.equal(renderCalls, 4)
})
