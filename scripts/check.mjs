#!/usr/bin/env node
/**
 * Runs the local quality gates in the order AGENTS.md lists them. Works on
 * every OS.
 *
 * Usage: pnpm check [--all]
 *   (none)  typecheck, lint, format check, unit tests, knip and the app + docs
 *           build; stops at the first failure.
 *   --all   everything, one after the other: coverage thresholds, the e2e
 *           suite and the audit of every dependency. Keeps going after a
 *           failure and prints a summary, so one run lists every problem.
 *           `pnpm check:all` is the same.
 */
import { spawnSync } from 'node:child_process'

const all = process.argv.includes('--all')

const steps = all
  ? [
      ['typecheck', ['run', 'typecheck']],
      ['lint', ['run', 'lint']],
      ['format check', ['run', 'format:check']],
      ['unit tests with coverage thresholds', ['run', 'test:coverage']],
      ['knip', ['run', 'knip']],
      ['app + docs build', ['run', 'build:all']],
      // A fresh preview of the build just made, never one left running from another build.
      ['e2e (Playwright)', ['run', 'test:e2e'], { ALPR_FRESH_PREVIEW: '1' }],
      ['audit of every dependency', ['run', 'security:audit']],
    ]
  : [
      ['typecheck', ['run', 'typecheck']],
      ['lint', ['run', 'lint']],
      ['format check', ['run', 'format:check']],
      ['unit tests', ['run', 'test:run']],
      ['knip', ['run', 'knip']],
      ['app + docs build', ['run', 'build:all']],
    ]

const results = []
for (const [i, [label, args, env]] of steps.entries()) {
  console.log(`\n=== ${i + 1}/${steps.length} ${label} ===`)
  const started = Date.now()
  const result = spawnSync('pnpm', args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...env },
  })
  const ok = result.status === 0
  results.push({ label, ok, seconds: Math.round((Date.now() - started) / 1000) })
  if (!ok) {
    console.error(`\n✖ ${label} failed`)
    if (!all) process.exit(result.status ?? 1)
  }
}

if (all) {
  console.log('\n=== Summary ===')
  for (const { label, ok, seconds } of results)
    console.log(`${ok ? '✔' : '✖'} ${label} (${seconds} s)`)
  const failed = results.filter((r) => !r.ok)
  if (failed.length) {
    console.error(`\n✖ ${failed.length} of ${results.length} failed`)
    process.exit(1)
  }
}

console.log('\n✔ All checks passed')
