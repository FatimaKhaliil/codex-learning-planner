import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const cli = fileURLToPath(new URL('../scripts/evaluation-data.mjs', import.meta.url))
const root = fileURLToPath(new URL('../', import.meta.url))
function run(args: string[]) {
  const temp = mkdtempSync(join(tmpdir(), 'evaluation-cli-test-'))
  const out = join(temp, 'out'), err = join(temp, 'err')
  const outFd = openSync(out, 'wx'), errFd = openSync(err, 'wx')
  try {
    // File descriptors avoid child-process pipes/socketpairs in a restricted
    // sandbox. These files contain only the synthetic test's CLI output.
    const result = spawnSync(process.execPath,
      ['--no-warnings', '--experimental-strip-types', cli, ...args], {
        cwd: root, timeout: 10000, stdio: ['ignore', outFd, errFd],
      })
    assert.equal(result.error, undefined, 'CLI subprocess must launch successfully')
    return { status: result.status, stdout: readFileSync(out, 'utf8'), stderr: readFileSync(err, 'utf8') }
  } finally {
    closeSync(outFd); closeSync(errFd)
    rmSync(temp, { recursive: true, force: true })
  }
}

// Invalid dates stop before creating the client: these are actual CLI-process
// tests, without emulator requests, test accounts or local file writes.
test('CLI accepts diagnose before or after date and reports only safe local stage metadata', () => {
  for (const args of [
    ['seed', '--diagnose', '--date', '2026-02-31'],
    ['seed', '--date', '2026-02-31', '--diagnose'],
  ]) {
    const result = run(args)
    assert.equal(result.status, 1)
    assert.equal(result.stdout, '')
    const events = result.stderr.trim().split('\n').map(line => JSON.parse(line))
    assert.deepEqual(events, [
      { scope: 'local-emulator-setup-only', diagnostic: {
        event: 'setup-stage', operation: 'seed', step: 'local-checks',
      } },
      { error: 'evaluation/invalid-date', scope: 'local-emulator-setup-only' },
    ])
  }
})

test('CLI rejects repeated or unknown diagnostic arguments without reflecting their values', () => {
  const sentinel = 'private-sentinel-must-never-appear'
  for (const args of [
    ['seed', '--diagnose', '--diagnose'],
    ['seed', '--date', '2026-11-09', '--date', '2026-11-09'],
    ['seed', '--date'],
    ['seed', '--unknown', sentinel],
    ['seed', '--diagnose', '--date', sentinel],
  ]) {
    const result = run(args)
    assert.equal(result.status, 1)
    assert.equal(result.stdout, '')
    assert.equal(result.stderr.includes(sentinel), false)
    const error = JSON.parse(result.stderr.trim().split('\n').at(-1)!)
    assert.equal(error.scope, 'local-emulator-setup-only')
    assert.match(error.error, /^evaluation\/(usage-|invalid-date)/)
  }
})

test('CLI remains quiet without diagnose and never includes an invalid date value', () => {
  const result = run(['seed', '--date', 'invalid-private-sentinel'])
  assert.equal(result.status, 1)
  assert.deepEqual(JSON.parse(result.stderr), {
    error: 'evaluation/invalid-date', scope: 'local-emulator-setup-only',
  })
})
