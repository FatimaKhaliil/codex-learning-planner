import assert from 'node:assert/strict'
import fs from 'node:fs'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { syncBuiltinESMExports } from 'node:module'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { resolveConfig } from 'vite'
import {
  assertEvaluationAuthBinding, assertEvaluationEnv, assertEvaluationFirebaseOptions, assertEvaluationTaskCache, evaluationEnvKeys,
  expectedEvaluationEnv, hasEvaluationTaskCache, parseEvaluationEnv,
} from '../config/evaluation-policy.ts'
import { initializeEvaluation } from '../scripts/evaluation-init.mjs'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const configFile = join(projectRoot, 'vite.config.ts')
const source = Object.entries(expectedEvaluationEnv).map(([key, value]) => `${key}=${value}`).join('\n') + '\n'
const options = {
  apiKey: expectedEvaluationEnv.VITE_FIREBASE_API_KEY,
  authDomain: expectedEvaluationEnv.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: expectedEvaluationEnv.VITE_FIREBASE_PROJECT_ID,
  storageBucket: '', messagingSenderId: '',
  appId: expectedEvaluationEnv.VITE_FIREBASE_APP_ID,
}

test('evaluation policy accepts only the complete fixed demo configuration and development use', () => {
  assert.equal(evaluationEnvKeys.length, 8)
  assert.deepEqual({ ...parseEvaluationEnv(source) }, expectedEvaluationEnv)
  assert.doesNotThrow(() => assertEvaluationEnv({ ...expectedEvaluationEnv }, true))
  assert.throws(() => assertEvaluationEnv({ ...expectedEvaluationEnv }, false), /rejected/)
  for (const key of evaluationEnvKeys) {
    const missing: Record<string, unknown> = { ...expectedEvaluationEnv }
    delete missing[key]
    assert.throws(() => assertEvaluationEnv(missing), /rejected/, key)
    assert.throws(() => assertEvaluationEnv({ ...expectedEvaluationEnv, [key]: 'fake-unsafe-sentinel' }), error =>
      error instanceof Error && /rejected/.test(error.message) && !error.message.includes('fake-unsafe-sentinel'))
  }
  for (const invalid of [source + source, source + 'VITE_EXTRA=fake-value\n', source.replace('evaluation-only-api-key', '${UNTRUSTED}'), '']) {
    assert.throws(() => parseEvaluationEnv(invalid), /rejected/)
  }
  assert.doesNotThrow(() => assertEvaluationFirebaseOptions(options))
  for (const key of Object.keys(options)) {
    assert.throws(() => assertEvaluationFirebaseOptions({ ...options, [key]: 'fake-production-sentinel' }), /rejected/)
  }
  assert.throws(() => assertEvaluationFirebaseOptions({ ...options, databaseURL: 'https://fake-production-sentinel.invalid' }), /rejected/)
  assert.throws(() => assertEvaluationFirebaseOptions(null), /rejected/)
})

test('evaluation init creates private dummy configuration without overwriting files or following symlinks', () => {
  const root = mkdtempSync(join(tmpdir(), 'learning-eval-init-'))
  try {
    const created = initializeEvaluation(root)
    assert.equal(readFileSync(created.configFile, 'utf8'), source)
    if (process.platform !== 'win32') {
      assert.equal(statSync(created.directory).mode & 0o777, 0o700)
      assert.equal(statSync(created.configFile).mode & 0o777, 0o600)
    }
    const before = readFileSync(created.configFile, 'utf8')
    assert.throws(() => initializeEvaluation(root), /already exists/)
    assert.equal(readFileSync(created.configFile, 'utf8'), before)
    if (process.platform !== 'win32') {
      const linkedRoot = join(root, 'linked-root')
      const destination = join(root, 'destination')
      mkdirSync(linkedRoot); mkdirSync(destination)
      symlinkSync(destination, join(linkedRoot, '.evaluation'), 'dir')
      assert.throws(() => initializeEvaluation(linkedRoot), /symbolic link/)
      assert.deepEqual(fs.readdirSync(destination), [])
      const fileRoot = join(root, 'file-link-root')
      mkdirSync(fileRoot); mkdirSync(join(fileRoot, '.evaluation'))
      const original = join(root, 'original')
      writeFileSync(original, 'fake-preserved-sentinel')
      symlinkSync(original, join(fileRoot, '.evaluation/.env.evaluation.local'))
      assert.throws(() => initializeEvaluation(fileRoot), /already exists/)
      assert.equal(readFileSync(original, 'utf8'), 'fake-preserved-sentinel')
    }
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('evaluation rejects Auth instances bound to another app, emulator endpoint or options', () => {
  const app = {}
  const emulator = { protocol: 'http', host: '127.0.0.1', port: 9099, options: { disableWarnings: false } }
  assert.doesNotThrow(() => assertEvaluationAuthBinding({ app, emulatorConfig: emulator }, app))
  for (const config of [null, { ...emulator, protocol: 'https' }, { ...emulator, host: 'localhost' },
    { ...emulator, host: 'fake-production.invalid' }, { ...emulator, port: 9098 }, { ...emulator, port: null },
    { ...emulator, options: { disableWarnings: true } }, { ...emulator, options: {} },
    { ...emulator, options: { disableWarnings: false, extra: true } }, { ...emulator, extra: true }]) {
    assert.throws(() => assertEvaluationAuthBinding({ app, emulatorConfig: config }, app), /rejected/)
  }
  assert.throws(() => assertEvaluationAuthBinding({ app: {}, emulatorConfig: emulator }, app), /rejected/)
  assert.throws(() => assertEvaluationAuthBinding({ app, emulatorConfig: emulator }, null), /rejected/)
})

test('evaluation HMR task cache requires a live matching app, mode, endpoint and verified metadata', () => {
  const app = {}
  const address = expectedEvaluationEnv.VITE_FIREBASE_FIRESTORE_EMULATOR_URL
  const cache = { initialized: true, tasksDb: { app }, evaluationApp: app, evaluationMode: 'evaluation', evaluationAddress: address }
  assert.equal(hasEvaluationTaskCache(undefined), false)
  assert.equal(hasEvaluationTaskCache({}), false)
  for (const oldCache of [{ tasksDb: { app } }, { initialized: false }, { evaluationMode: 'development' }]) {
    assert.equal(hasEvaluationTaskCache(oldCache), true)
    assert.throws(() => assertEvaluationTaskCache(oldCache, app, 'evaluation', address), /rejected/)
  }
  assert.doesNotThrow(() => assertEvaluationTaskCache(cache, app, 'evaluation', address))
  for (const invalid of [undefined, {}, { initialized: true, tasksDb: { app } },
    { ...cache, initialized: false }, { ...cache, tasksDb: null }, { ...cache, tasksDb: { app: {} } },
    { ...cache, evaluationApp: {} }, { ...cache, evaluationMode: 'development' },
    { ...cache, evaluationAddress: 'http://127.0.0.1:8082' }]) {
    assert.throws(() => assertEvaluationTaskCache(invalid, app, 'evaluation', address), /rejected/)
  }
  assert.throws(() => assertEvaluationTaskCache(cache, null, 'evaluation', address), /rejected/)
  assert.throws(() => assertEvaluationTaskCache(cache, {}, 'evaluation', address), /rejected/)
  assert.throws(() => assertEvaluationTaskCache(cache, app, 'development', address), /rejected/)
  assert.throws(() => assertEvaluationTaskCache(cache, app, 'evaluation', 'http://127.0.0.1:8082'), /rejected/)
})

test('actual Vite evaluation resolution isolates root env files, exposes only allowlisted values, and fails closed', async t => {
  const root = mkdtempSync(join(tmpdir(), 'learning-eval-vite-'))
  const shellKeys = [...evaluationEnvKeys, 'VITE_UNRELATED_SECRET', 'VITE_FIREBASE_API_KEY_EXTRA', 'NODE_ENV', 'VITE_USER_NODE_ENV']
  const previous = new Map(shellKeys.map(key => [key, process.env[key]]))
  for (const key of shellKeys) delete process.env[key]
  process.env.NODE_ENV = 'development'
  const sentinelFile = join(root, '.env.local')
  // Only this newly-created sandbox sentinel is written; never the real file.
  writeFileSync(sentinelFile, 'VITE_FIREBASE_PROJECT_ID=fake-root-production-sentinel\nVITE_UNRELATED_SECRET=fake-root-secret-sentinel\n')
  const originalRead = fs.readFileSync
  let rootEnvRead = false
  fs.readFileSync = ((file, ...args) => {
    if (typeof file === 'string' && resolve(file) === sentinelFile) {
      rootEnvRead = true
      throw new Error('Root env file must not be read in evaluation mode.')
    }
    return originalRead(file, ...args)
  }) as typeof fs.readFileSync
  syncBuiltinESMExports()
  const getConfig = (command: 'serve' | 'build' = 'serve', preview = false) =>
    resolveConfig({ root, configFile, mode: 'evaluation', logLevel: 'silent' }, command, 'evaluation', 'development', preview)
  try {
    await t.test('build and preview are rejected before reading any evaluation file', async () => {
      await assert.rejects(getConfig('build'), /build and preview are forbidden/)
      await assert.rejects(getConfig('serve', true), /build and preview are forbidden/)
    })
    await t.test('missing configuration rejects server startup', async () => {
      await assert.rejects(getConfig(), /missing or unsafe/)
    })
    const created = initializeEvaluation(root)
    await t.test('root fake production config is unread and unknown shell values are not exposed', async () => {
      process.env.VITE_UNRELATED_SECRET = 'fake-shell-secret-sentinel'
      const config = await getConfig()
      assert.equal(rootEnvRead, false)
      assert.equal(config.envDir, join(root, '.evaluation'))
      assert.deepEqual(config.envPrefix, [])
      assert.equal(config.server.host, '127.0.0.1')
      assert.equal(config.server.port, 5187)
      assert.equal(config.server.strictPort, true)
      assert.equal(config.server.fs.strict, true)
      assert.equal(config.env.DEV, true)
      assert.deepEqual(Object.keys(config.env).filter(key => key.startsWith('VITE_')), [])
      for (const key of evaluationEnvKeys) assert.equal(config.define[`import.meta.env.${key}`], JSON.stringify(expectedEvaluationEnv[key]))
      assert.equal(JSON.stringify(config.define).includes('fake-shell-secret-sentinel'), false)
      const csp = String(config.server.headers?.['Content-Security-Policy'])
      assert.match(csp, /connect-src 'self' http:\/\/127\.0\.0\.1:9099 http:\/\/127\.0\.0\.1:8081 ws:\/\/127\.0\.0\.1:5187/)
      assert.match(csp, /img-src 'self'/)
      assert.doesNotMatch(csp, /googleapis|gstatic|https:/)
      const overridden = await resolveConfig({ root, configFile, mode: 'evaluation', envPrefix: ['VITE_'], logLevel: 'silent' }, 'serve', 'evaluation', 'development')
      assert.deepEqual(overridden.envPrefix, [])
      assert.deepEqual(Object.keys(overridden.env).filter(key => key.startsWith('VITE_')), [])
    })
    await t.test('conflicting exact and prefix-suffixed shell keys reject without echoing their values', async () => {
      for (const key of ['VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_API_KEY_EXTRA']) {
        process.env[key] = 'fake-shell-conflict-must-not-be-logged'
        await assert.rejects(getConfig(), error => error instanceof Error && /Conflicting shell/.test(error.message) && !error.message.includes(process.env[key]!))
        delete process.env[key]
      }
    })
    await t.test('wrong file values and additional isolated env files are rejected', async () => {
      writeFileSync(created.configFile, source.replace('demo-learning-planner-web', 'fake-wrong-app'))
      await assert.rejects(getConfig(), /missing or invalid/)
      writeFileSync(created.configFile, source)
      writeFileSync(join(created.directory, '.env'), 'VITE_FIREBASE_PROJECT_ID=fake-extra-source\n')
      await assert.rejects(getConfig(), /Additional evaluation env files/)
      rmSync(join(created.directory, '.env'))
      assert.equal(rootEnvRead, false)
    })
    await t.test('production NODE_ENV is rejected even with otherwise valid isolated configuration', async () => {
      process.env.NODE_ENV = 'production'
      await assert.rejects(getConfig(), /build and preview are forbidden/)
      process.env.NODE_ENV = 'development'
    })
    await t.test('Vite refuses linked evaluation directories and config files', { skip: process.platform === 'win32' }, async () => {
      const linkedRoot = join(root, 'linked-vite-root')
      mkdirSync(linkedRoot)
      symlinkSync(created.directory, join(linkedRoot, '.evaluation'), 'dir')
      await assert.rejects(resolveConfig({ root: linkedRoot, configFile, mode: 'evaluation', logLevel: 'silent' }, 'serve', 'evaluation', 'development'), /missing or unsafe/)
      const target = join(root, 'safe-file-link-target')
      writeFileSync(target, source)
      rmSync(created.configFile)
      symlinkSync(target, created.configFile)
      await assert.rejects(getConfig(), /missing or invalid/)
      assert.equal(readFileSync(target, 'utf8'), source)
    })
  } finally {
    fs.readFileSync = originalRead
    syncBuiltinESMExports()
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    rmSync(root, { recursive: true, force: true })
  }
})
