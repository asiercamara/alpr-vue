/**
 * Mutation testing (`pnpm test:mutation`). Not part of `pnpm check:all`: it runs the unit
 * suite once per mutant, so it takes minutes, not seconds.
 *
 * Scope is the logic the unit and property tests are meant to pin down: the plate store and
 * the pure utils and worker helpers. Components and anything that touches the browser are
 * left out: their tests are about wiring, and mutating them mostly measures jsdom noise.
 *
 * `incremental` keeps the previous verdicts in reports/, so a second run only re-tests the
 * mutants whose code or tests changed. `break` is null on purpose until a baseline score is
 * agreed; set it to fail the run below that score.
 */
export default {
  // With pnpm, Stryker only looks for plugins next to its own `core` package inside
  // node_modules/.pnpm, where the runner is not: it has to be named.
  plugins: ['@stryker-mutator/vitest-runner'],
  // vitest picks up vitest.config.ts from the root by itself.
  testRunner: 'vitest',
  // Not copied to the sandbox. The unit tests read vercel.json, index.html, package.json, docs/
  // (the .md files and .vitepress/sidebar.ts) and scripts/, so those must stay. `.claude/skills`
  // holds symlinks to directories, which Stryker cannot copy (EISDIR).
  ignorePatterns: [
    '/.claude',
    '/.agents',
    '/e2e',
    '/public',
    '/dist',
    '/coverage',
    '/playwright-report',
    '/test-results',
    '/.playwright*',
    '/docs/.vitepress/dist',
    '/docs/.vitepress/cache',
    '/docs/vtdoc-merged',
  ],
  mutate: [
    'src/stores/plateStore.ts',
    'src/utils/confidence.ts',
    'src/utils/export.ts',
    'src/utils/validation.ts',
    'src/workers/detector/detector/boundingBoxUtils.ts',
    'src/workers/ocr/ocr/textProcessor.ts',
  ],
  reporters: ['clear-text', 'progress', 'html'],
  // The table and the surviving mutants are what matter; one line per test is noise.
  clearTextReporter: { logTests: false },
  htmlReporter: { fileName: 'reports/mutation/index.html' },
  incremental: true,
  incrementalFile: 'reports/stryker-incremental.json',
  tempDirName: '.stryker-tmp',
  thresholds: { high: 80, low: 60, break: null },
}
