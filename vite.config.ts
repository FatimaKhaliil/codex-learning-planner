import { closeSync, constants, existsSync, fstatSync, lstatSync, openSync, readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { assertEvaluationEnv, evaluationEnvKeys, evaluationMode, expectedEvaluationEnv, parseEvaluationEnv } from './config/evaluation-policy.ts'

const evaluationCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self' http://127.0.0.1:9099 http://127.0.0.1:8081 ws://127.0.0.1:5187",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

function evaluationSafety(): Plugin {
  return {
    name: 'local-evaluation-safety',
    enforce: 'pre',
    config(config) {
      const envDir = resolve(config.root ?? process.cwd(), '.evaluation')
      const envFile = join(envDir, '.env.evaluation.local')
      // Do not follow a link into another directory or read any root .env file.
      if (!existsSync(envDir) || lstatSync(envDir).isSymbolicLink() || !lstatSync(envDir).isDirectory()) {
        throw new Error('Evaluation configuration is missing or unsafe. Run npm run evaluation:init first.')
      }
      for (const other of ['.env', '.env.local', '.env.evaluation']) {
        if (existsSync(join(envDir, other))) throw new Error('Additional evaluation env files are not permitted.')
      }
      let descriptor: number | undefined
      try {
        if (lstatSync(envFile).isSymbolicLink()) throw new Error('unsafe-evaluation-file')
        descriptor = openSync(envFile, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
        const stat = fstatSync(descriptor)
        if (!stat.isFile() || stat.size > 8192) throw new Error('unsafe-evaluation-file')
        parseEvaluationEnv(readFileSync(descriptor, 'utf8'))
      } catch {
        throw new Error('Evaluation configuration is missing or invalid. No Firebase connection was initialized.')
      } finally { if (descriptor !== undefined) closeSync(descriptor) }

      // Reject shell overrides before loadEnv: DEBUG=vite:env must not log a
      // conflicting value. Unknown shell VITE_* keys are never loaded/exposed.
      for (const key of Object.keys(process.env)) {
        if (evaluationEnvKeys.some(allowed => key.startsWith(allowed)) &&
          (!Object.hasOwn(expectedEvaluationEnv, key) || process.env[key] !== expectedEvaluationEnv[key as keyof typeof expectedEvaluationEnv])) {
          throw new Error('Conflicting shell configuration rejected for evaluation. No values were logged.')
        }
      }
      const env = loadEnv(evaluationMode, envDir, [...evaluationEnvKeys])
      assertEvaluationEnv(env)
      // Array merging must not retain an inline/envPrefix override in Vite.
      config.envPrefix = []
      return {
        envDir,
        envPrefix: [],
        define: Object.fromEntries(evaluationEnvKeys.map(key => [`import.meta.env.${key}`, JSON.stringify(env[key])])),
        server: {
          host: '127.0.0.1', port: 5187, strictPort: true, open: false,
          ws: { host: '127.0.0.1', port: 5187 },
          headers: { 'Content-Security-Policy': evaluationCsp },
          fs: { strict: true, deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.evaluation/**'] },
        },
      }
    },
    configResolved(config) {
      if (config.isProduction || config.command !== 'serve') {
        throw new Error('Evaluation requires the local development server; build and preview are forbidden.')
      }
      if (!Array.isArray(config.envPrefix) || config.envPrefix.length || Object.keys(config.env).some(key => key.startsWith('VITE_'))) {
        throw new Error('Evaluation rejected automatic client environment exposure.')
      }
    },
  }
}

export default defineConfig(({ mode, command, isPreview }) => {
  if (mode !== evaluationMode) return { plugins: [react()] }
  if (command !== 'serve' || isPreview || process.env.NODE_ENV === 'production') {
    throw new Error('Evaluation requires vite serve --mode evaluation; build and preview are forbidden.')
  }
  return { plugins: [evaluationSafety(), react()], envDir: '.evaluation', envPrefix: [] }
})
