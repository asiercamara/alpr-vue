import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8')

/** Contents of every `<script>` without `src` in index.html (the theme FOUC script). */
const inlineScripts = [
  ...read('index.html').matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g),
].map((match) => match[1])

const appCsp = (
  JSON.parse(read('vercel.json')) as {
    headers: { source: string; headers: { key: string; value: string }[] }[]
  }
).headers
  .filter((rule) => !rule.source.startsWith('/docs'))
  .flatMap((rule) => rule.headers)
  .find((header) => header.key === 'Content-Security-Policy')?.value

describe('app Content-Security-Policy (vercel.json)', () => {
  it('allows each inline script of index.html by hash', () => {
    expect(inlineScripts.length).toBeGreaterThan(0)
    for (const script of inlineScripts) {
      const hash = createHash('sha256').update(script).digest('base64')
      expect(appCsp).toContain(`'sha256-${hash}'`)
    }
  })
})
