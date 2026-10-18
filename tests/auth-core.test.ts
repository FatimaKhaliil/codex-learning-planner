import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import { authErrorMessage } from '../src/auth/errors.ts'
import { validateAuthForm } from '../src/auth/validation.ts'

const email = `${randomUUID()}@example.test`
const password = randomUUID()

test('all forms require a valid email address', () => {
  for (const mode of ['login', 'register', 'reset'] as const) {
    assert.ok(validateAuthForm(mode, { email: '', password, confirmation: password }).email)
    assert.ok(validateAuthForm(mode, { email: randomUUID(), password, confirmation: password }).email)
    assert.ok(validateAuthForm(mode, { email: `a b@${randomUUID()}.test`, password, confirmation: password }).email)
    assert.equal(validateAuthForm(mode, { email: ` ${email} `, password, confirmation: password }).email, undefined)
  }
})

test('login requires a password without imposing the registration minimum', () => {
  assert.ok(validateAuthForm('login', { email, password: '' }).password)
  assert.deepEqual(validateAuthForm('login', { email, password: password.slice(0, 1) }), {})
  assert.deepEqual(validateAuthForm('login', { email, password: ' ' }), {})
})

test('registration enforces six characters and an exact confirmation', () => {
  assert.ok(validateAuthForm('register', { email }).password)
  assert.ok(validateAuthForm('register', { email, password: password.slice(0, 5) }).password)
  assert.equal(validateAuthForm('register', { email, password: password.slice(0, 6) }).password, undefined)
  assert.ok(validateAuthForm('register', { email, password }).confirmation)
  assert.ok(validateAuthForm('register', { email, password, confirmation: randomUUID() }).confirmation)
  assert.deepEqual(validateAuthForm('register', { email, password, confirmation: password }), {})
})

test('password whitespace is preserved when checking confirmation', () => {
  const passwordWithWhitespace = ` ${password} `
  assert.deepEqual(validateAuthForm('register', {
    email, password: passwordWithWhitespace, confirmation: passwordWithWhitespace,
  }), {})
  assert.ok(validateAuthForm('register', {
    email, password: passwordWithWhitespace, confirmation: password,
  }).confirmation)
})

test('password reset validates only the email address', () => {
  assert.deepEqual(validateAuthForm('reset', { email }), {})
  assert.deepEqual(validateAuthForm('reset', { email, password: '', confirmation: '' }), {})
})

test('invalid login errors do not disclose whether an account exists', () => {
  const message = authErrorMessage({ code: 'auth/invalid-credential' })
  for (const code of ['auth/wrong-password', 'auth/user-not-found', 'auth/invalid-login-credentials']) {
    assert.equal(authErrorMessage({ code }), message)
  }
})

test('known Firebase errors have understandable German messages', () => {
  assert.match(authErrorMessage({ code: 'auth/network-request-failed' }), /Internetverbindung/)
  assert.match(authErrorMessage({ code: 'auth/too-many-requests' }), /warte/)
  assert.match(authErrorMessage({ code: 'auth/email-already-in-use' }), /bereits ein Konto/)
  assert.match(authErrorMessage({ code: 'auth/weak-password' }), /mindestens 6/)
  assert.match(authErrorMessage({ code: 'auth/operation-not-allowed' }), /freigeschaltet/)
  assert.match(authErrorMessage({ code: 'auth/configuration-not-ready' }), /Konfiguration/)
})

test('unknown errors use a safe fallback without exposing server details', () => {
  const fallback = authErrorMessage(null)
  for (const error of [
    undefined, {}, new Error(randomUUID()),
    { code: randomUUID(), message: randomUUID() }, { code: 42 },
    { code: 'toString' }, { code: '__proto__' }, { code: 'constructor' },
  ]) {
    assert.equal(authErrorMessage(error), fallback)
  }
  assert.match(fallback, /erneut/)
})
