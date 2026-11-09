import { randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import {
  chmodSync, constants, existsSync, closeSync, fstatSync, lstatSync, mkdirSync,
  openSync, readFileSync, realpathSync, writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertEvaluationEnv, expectedEvaluationEnv } from '../config/evaluation-policy.ts'
import {
  assertAccount, berlinDateKey, createBaseline, createEvaluationClient,
  EVALUATION_EMAIL, EVALUATION_PROJECT, EVALUATION_UID, EvaluationSetupError, TASK_IDS,
} from './evaluation-data-core.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const directory = join(root, '.evaluation')
const accountFile = join(directory, 'account.json')
const manifestFile = join(directory, 'baseline.json')

function fail(code) { throw new EvaluationSetupError(code) }

function assertSafeLocalPath(path) {
  if (existsSync(directory)) {
    if (!lstatSync(directory).isDirectory() || lstatSync(directory).isSymbolicLink() ||
      realpathSync(directory) !== join(realpathSync(root), '.evaluation')) fail('evaluation/unsafe-local-directory')
  }
  if (existsSync(path) && (!lstatSync(path).isFile() || lstatSync(path).isSymbolicLink())) fail('evaluation/unsafe-local-file')
}

function readJson(path) {
  assertSafeLocalPath(path)
  if (!existsSync(path)) return null
  const fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
  try {
    if (!fstatSync(fd).isFile() || fstatSync(fd).size > 16 * 1024) fail('evaluation/invalid-local-file')
    return JSON.parse(readFileSync(fd, 'utf8'))
  } finally { closeSync(fd) }
}

function assertIgnored() {
  try {
    execFileSync('git', ['check-ignore', '-q', '--', '.evaluation/account.json'], { cwd: root, stdio: 'ignore' })
    execFileSync('git', ['check-ignore', '-q', '--', '.evaluation/baseline.json'], { cwd: root, stdio: 'ignore' })
  } catch { fail('evaluation/local-directory-must-be-gitignored') }
}

function writeJson(path, value, exclusive = false) {
  assertIgnored()
  assertSafeLocalPath(path)
  if (!existsSync(directory)) mkdirSync(directory, { mode: 0o700 })
  const flags = constants.O_WRONLY | constants.O_CREAT | (constants.O_NOFOLLOW ?? 0) |
    (exclusive ? constants.O_EXCL : constants.O_TRUNC)
  const fd = openSync(path, flags, 0o600)
  try {
    if (!fstatSync(fd).isFile()) fail('evaluation/unsafe-local-file')
    writeFileSync(fd, `${JSON.stringify(value, null, 2)}\n`)
    chmodSync(path, 0o600)
  } finally { closeSync(fd) }
}

function parseArguments(args) {
  const [mode, ...rest] = args
  if (!['seed', 'reset', 'verify'].includes(mode)) fail('evaluation/usage-seed-reset-verify')
  let date
  let diagnose = false
  for (let index = 0; index < rest.length; index++) {
    if (rest[index] === '--diagnose' && !diagnose) diagnose = true
    else if (rest[index] === '--date' && date === undefined && rest[index + 1] && !rest[index + 1].startsWith('--')) date = rest[++index]
    else fail('evaluation/usage-date-YYYY-MM-DD-or-diagnose')
  }
  return { mode, date, diagnose }
}

function baselineDate(manifest, explicitDate, mode) {
  if (manifest && (manifest.schemaVersion !== 1 || manifest.baseline !== 'D0' ||
    manifest.projectId !== EVALUATION_PROJECT || manifest.uid !== EVALUATION_UID ||
    JSON.stringify(manifest.taskIds) !== JSON.stringify(TASK_IDS))) fail('evaluation/invalid-baseline-manifest')
  const date = explicitDate ?? manifest?.date ?? (mode === 'seed' ? berlinDateKey() : null)
  if (!date) fail('evaluation/baseline-date-required')
  createBaseline(date)
  return date
}

async function main() {
  const { mode, date: explicitDate, diagnose } = parseArguments(process.argv.slice(2))
  const trace = event => {
    if (diagnose) process.stderr.write(`${JSON.stringify({ scope: 'local-emulator-setup-only', diagnostic: event })}\n`)
  }
  const stage = step => trace({ event: 'setup-stage', operation: mode, step })
  stage('local-checks')
  // Share the immutable evaluation policy, but do not read .env.local (or any
  // .env file). The CLI's transport independently hardcodes its endpoints.
  assertEvaluationEnv(expectedEvaluationEnv)
  if (expectedEvaluationEnv.VITE_FIREBASE_PROJECT_ID !== EVALUATION_PROJECT ||
    expectedEvaluationEnv.VITE_FIREBASE_AUTH_EMULATOR_URL !== 'http://127.0.0.1:9099' ||
    expectedEvaluationEnv.VITE_FIREBASE_FIRESTORE_EMULATOR_URL !== 'http://127.0.0.1:8081') fail('evaluation/policy-mismatch')
  assertIgnored()
  const date = baselineDate(readJson(manifestFile), explicitDate, mode)
  let account = readJson(accountFile)
  if (account) assertAccount(account)
  if (!account && mode !== 'seed') fail('evaluation/local-account-missing')
  const client = createEvaluationClient({ onDiagnostic: diagnose ? trace : undefined })
  if (mode === 'verify') {
    stage('verify-baseline')
    const counts = await client.verify(date, account)
    process.stdout.write(`${JSON.stringify({ mode, baseline: 'D0', date, counts, environment: 'local-emulator-admin-read-only' })}\n`)
    return
  }
  const requireAbsentAccount = !account
  if (!account) {
    // Firestore MUST be ready before local credentials or an Auth user are
    // created. An already present UID/email without credentials is a collision.
    stage('inspect-before-credentials')
    if ((await client.inspect()).accountExists) fail('evaluation/account-already-exists-without-local-credentials')
    account = { schemaVersion: 1, projectId: EVALUATION_PROJECT, uid: EVALUATION_UID,
      email: EVALUATION_EMAIL, password: randomBytes(32).toString('base64url') }
    stage('write-local-account')
    writeJson(accountFile, account, true)
  }
  stage('restore-baseline')
  const counts = await client.restore(mode, account, date, { requireAbsentAccount })
  const manifest = { schemaVersion: 1, baseline: 'D0', projectId: EVALUATION_PROJECT,
    uid: EVALUATION_UID, email: EVALUATION_EMAIL, timeZone: 'Europe/Berlin', date,
    taskIds: [...TASK_IDS], tasks: createBaseline(date), counts,
    preparedAt: new Date().toISOString(), environment: 'local-emulators-only',
    setupAccess: 'project-and-account-scoped-emulator-admin-rules-bypass' }
  stage('write-baseline-manifest')
  writeJson(manifestFile, manifest)
  process.stdout.write(`${JSON.stringify({ mode, baseline: 'D0', date, counts,
    manifest: '.evaluation/baseline.json', credentials: '.evaluation/account.json',
    environment: 'local-emulators-only', note: 'Setup only; no application or usability evaluation.' })}\n`)
}

try { await main() } catch (error) {
  // Do not print stack/message/cause or remote responses, which can carry secrets.
  const code = error instanceof EvaluationSetupError ? error.code : 'evaluation/local-setup-failed'
  process.stderr.write(`${JSON.stringify({ error: code, scope: 'local-emulator-setup-only',
    ...(error instanceof EvaluationSetupError && error.diagnostic ? { diagnostic: error.diagnostic } : {}) })}\n`)
  process.exitCode = 1
}
