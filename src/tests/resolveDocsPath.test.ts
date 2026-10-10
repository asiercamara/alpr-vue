import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { resolveDocsPath } from '../../scripts/resolve-docs-path'

const DIST = resolve('/project/dist')

describe('resolveDocsPath', () => {
  it('maps a docs page to its file under dist/docs', () => {
    expect(resolveDocsPath(DIST, '/docs/introduction.html')).toBe(
      resolve(DIST, 'docs/introduction.html'),
    )
  })

  it('maps nested paths (Spanish docs, assets)', () => {
    expect(resolveDocsPath(DIST, '/docs/es/quickstart.html')).toBe(
      resolve(DIST, 'docs/es/quickstart.html'),
    )
    expect(resolveDocsPath(DIST, '/docs/assets/app.abc123.js')).toBe(
      resolve(DIST, 'docs/assets/app.abc123.js'),
    )
  })

  it('maps the docs root itself (the caller serves its index.html)', () => {
    expect(resolveDocsPath(DIST, '/docs')).toBe(resolve(DIST, 'docs'))
    expect(resolveDocsPath(DIST, '/docs/')).toBe(resolve(DIST, 'docs'))
  })

  it('allows .. segments that stay inside dist/docs', () => {
    expect(resolveDocsPath(DIST, '/docs/es/../faq.html')).toBe(resolve(DIST, 'docs/faq.html'))
  })

  it.each([
    '/docs/../../package.json',
    '/docs/../../../../etc/passwd',
    '/docs/es/../../../package.json',
    '/docs/..',
    '/docs/../index.html',
    '/docs/../../dist-secret/file',
  ])('rejects %s, which escapes dist/docs', (url) => {
    expect(resolveDocsPath(DIST, url)).toBeNull()
  })

  it('does not treat a sibling folder with the same prefix as inside dist/docs', () => {
    expect(resolveDocsPath(DIST, '/docs/../docs-private/secret.html')).toBeNull()
  })
})
