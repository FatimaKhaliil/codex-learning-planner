import { closeSync, constants, lstatSync, mkdirSync, openSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expectedEvaluationEnv } from '../config/evaluation-policy.ts'

/** Creates only the dedicated ignored dummy configuration; never reads .env.local. */
export function initializeEvaluation(root = process.cwd()) {
  const directory = resolve(root, '.evaluation')
  try { mkdirSync(directory, { mode: 0o700 }) }
  catch (cause) { if (cause.code !== 'EEXIST') throw cause }
  const stat = lstatSync(directory)
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Evaluation directory must be a real directory, not a symbolic link.')
  const configFile = join(directory, '.env.evaluation.local')
  let descriptor
  try {
    descriptor = openSync(configFile, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0), 0o600)
    writeFileSync(descriptor, Object.entries(expectedEvaluationEnv).map(([key, value]) => `${key}=${value}`).join('\n') + '\n', 'utf8')
  } catch (cause) {
    if (cause.code === 'EEXIST' || cause.code === 'ELOOP') {
      throw new Error('Evaluation configuration already exists. Nothing was overwritten.')
    }
    throw cause
  } finally { if (descriptor !== undefined) closeSync(descriptor) }
  return { directory, configFile }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    initializeEvaluation()
    console.log('Created .evaluation/.env.evaluation.local with fixed public demo values. No existing configuration was changed.')
  } catch {
    console.error('Evaluation initialization stopped. The dedicated directory must be real and the configuration must not already exist; nothing was overwritten.')
    process.exitCode = 1
  }
}
