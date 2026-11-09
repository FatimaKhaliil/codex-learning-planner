/** Fixed public dummy configuration for the local evaluation only. No secrets. */
export const evaluationMode = 'evaluation'

export const expectedEvaluationEnv = Object.freeze({
  VITE_FIREBASE_API_KEY: 'evaluation-only-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'demo-learning-planner.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'demo-learning-planner',
  VITE_FIREBASE_STORAGE_BUCKET: '',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '',
  VITE_FIREBASE_APP_ID: 'demo-learning-planner-web',
  VITE_FIREBASE_AUTH_EMULATOR_URL: 'http://127.0.0.1:9099',
  VITE_FIREBASE_FIRESTORE_EMULATOR_URL: 'http://127.0.0.1:8081',
})

export const evaluationEnvKeys = Object.freeze(Object.keys(expectedEvaluationEnv) as (keyof typeof expectedEvaluationEnv)[])

const rejectedMessage = 'Evaluation configuration rejected. Only the fixed local demo project and emulator endpoints are permitted.'

/** Values are deliberately never included in errors, including shell conflicts. */
export function assertEvaluationEnv(env: Record<string, unknown>, development?: boolean): void {
  if (development === false || !env || evaluationEnvKeys.some(key =>
    !Object.hasOwn(env, key) || env[key] !== expectedEvaluationEnv[key])) {
    throw new Error(rejectedMessage)
  }
}

/** The generated file is a literal allowlist, without interpolation or overrides. */
export function parseEvaluationEnv(source: string): Record<string, string> {
  const env: Record<string, string> = Object.create(null)
  for (const line of source.split(/\r?\n/u)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/u.exec(line)
    if (!match || !evaluationEnvKeys.includes(match[1] as keyof typeof expectedEvaluationEnv) || Object.hasOwn(env, match[1])) {
      throw new Error(rejectedMessage)
    }
    env[match[1]] = match[2]
  }
  assertEvaluationEnv(env)
  return env
}

/** Prevent reusing a cached Firebase app initialized with another configuration. */
export function assertEvaluationFirebaseOptions(options: unknown): void {
  if (!options || typeof options !== 'object') throw new Error(rejectedMessage)
  const record = options as Record<string, unknown>
  const expected = {
    apiKey: expectedEvaluationEnv.VITE_FIREBASE_API_KEY,
    authDomain: expectedEvaluationEnv.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: expectedEvaluationEnv.VITE_FIREBASE_PROJECT_ID,
    storageBucket: expectedEvaluationEnv.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: expectedEvaluationEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: expectedEvaluationEnv.VITE_FIREBASE_APP_ID,
  }
  if (Object.keys(record).some(key => !Object.hasOwn(expected, key)) ||
    Object.entries(expected).some(([key, value]) => !Object.hasOwn(record, key) || record[key] !== value)) {
    throw new Error(rejectedMessage)
  }
}

/** Public Auth SDK state must describe the exact local emulator, including options. */
export function assertEvaluationAuthBinding(auth: unknown, app: unknown): void {
  if (!app || !auth || typeof auth !== 'object') throw new Error(rejectedMessage)
  const record = auth as { app?: unknown; emulatorConfig?: unknown }
  const emulator = record.emulatorConfig
  if (record.app !== app || !emulator || typeof emulator !== 'object') throw new Error(rejectedMessage)
  const config = emulator as Record<string, unknown>
  const options = config.options
  if (Object.keys(config).some(key => !['protocol', 'host', 'port', 'options'].includes(key)) ||
    config.protocol !== 'http' || config.host !== '127.0.0.1' || config.port !== 9099 ||
    !options || typeof options !== 'object' ||
    Object.keys(options).length !== 1 || !Object.hasOwn(options, 'disableWarnings') ||
    (options as Record<string, unknown>).disableWarnings !== false) {
    throw new Error(rejectedMessage)
  }
}

export interface EvaluationTaskCacheBinding {
  initialized?: boolean
  tasksDb?: { app: unknown } | null
  evaluationApp?: unknown
  evaluationMode?: unknown
  evaluationAddress?: unknown
}

export function hasEvaluationTaskCache(cache: EvaluationTaskCacheBinding | undefined): boolean {
  return !!cache && ['initialized', 'tasksDb', 'evaluationApp', 'evaluationMode', 'evaluationAddress'].some(key => Object.hasOwn(cache, key))
}

/** HMR metadata is written only after successful local emulator connection. */
export function assertEvaluationTaskCache(cache: EvaluationTaskCacheBinding | undefined, app: unknown, mode: unknown, address: unknown): void {
  if (!app || !cache || cache.initialized !== true || !cache.tasksDb || cache.tasksDb.app !== app ||
    mode !== evaluationMode || address !== expectedEvaluationEnv.VITE_FIREBASE_FIRESTORE_EMULATOR_URL ||
    cache.evaluationApp !== app || cache.evaluationMode !== mode || cache.evaluationAddress !== address) {
    throw new Error(rejectedMessage)
  }
}
