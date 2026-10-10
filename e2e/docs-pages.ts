import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'

/** Not published pages: mirrors `srcExclude` in docs/.vitepress/config.ts. */
const EXCLUDED = /^(README(\.es)?|CONTRIBUTING|AGENTS)\.md$|^LICENSE$/

/** URL paths of every published docs page, derived from the files so the list cannot drift. */
export function docsPaths(): string[] {
  const root = resolve(process.cwd(), 'docs')
  const paths: string[] = []
  for (const [dir, prefix] of [
    [root, '/docs'],
    [resolve(root, 'es'), '/docs/es'],
  ] as const) {
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.md') || EXCLUDED.test(name)) continue
      const page = name.replace(/\.md$/, '')
      paths.push(page === 'index' ? `${prefix}/` : `${prefix}/${page}`)
    }
  }
  return paths
}
