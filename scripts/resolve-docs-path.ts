import { resolve, sep } from 'node:path'

/**
 * Maps a `/docs/...` request URL to a file under `<distDir>/docs`.
 *
 * Returns `null` when the resolved path escapes `dist/docs` (e.g. `/docs/../../package.json`),
 * so the dev middleware never serves files outside the built docs.
 */
export function resolveDocsPath(distDir: string, url: string): string | null {
  const docsRoot = resolve(distDir, 'docs')
  const filePath = resolve(distDir, url.slice(1))
  return filePath === docsRoot || filePath.startsWith(docsRoot + sep) ? filePath : null
}
