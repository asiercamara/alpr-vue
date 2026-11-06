import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface HeaderRule {
  source: string
  headers: { key: string; value: string }[]
}

const rules = (
  JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8')) as {
    headers: HeaderRule[]
  }
).headers

/**
 * Headers Vercel adds to a response for `pathname`, according to `vercel.json`.
 *
 * Every rule whose `source` matches the whole path applies, and a later rule wins over an
 * earlier one for the same header. The sources in the file are plain regular expressions
 * (no `:name` parameters), so an anchored `RegExp` matches them like Vercel does.
 */
export function vercelHeadersFor(pathname: string): Record<string, string> {
  const headers: Record<string, string> = {}
  for (const rule of rules) {
    // The source comes from our own vercel.json, not from user input
    // eslint-disable-next-line security/detect-non-literal-regexp
    if (!new RegExp(`^${rule.source}$`).test(pathname)) continue
    for (const { key, value } of rule.headers) headers[key] = value
  }
  return headers
}
