import { describe, it, expect } from 'vitest'
import { vercelHeadersFor } from './vercelHeaders'

const csp = (pathname: string) => vercelHeadersFor(pathname)['Content-Security-Policy']

describe('vercel.json headers', () => {
  it.each(['/', '/index.html', '/assets/index-abc123.js', '/models/plate.onnx', '/manifest.json'])(
    'gives the app CSP (no inline scripts, wasm allowed) to %s',
    (path) => {
      expect(csp(path)).toContain("'wasm-unsafe-eval'")
      expect(csp(path)).not.toContain("'unsafe-inline'")
    },
  )

  // `/docs` without the trailing slash used to match neither docs rule's lookahead
  // and got the app CSP, which blocks the inline scripts and styles of the docs
  it.each(['/docs', '/docs/', '/docs/es', '/docs/es/', '/docs/assets/site.css'])(
    'gives the docs CSP (inline allowed, no wasm) to %s',
    (path) => {
      expect(csp(path)).toContain("script-src 'self' 'unsafe-inline'")
      expect(csp(path)).not.toContain("'wasm-unsafe-eval'")
    },
  )

  it.each(['/', '/docs', '/docs/es/'])('sets the common security headers on %s', (path) => {
    const headers = vercelHeadersFor(path)
    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['Permissions-Policy']).toContain('camera=(self)')
    expect(headers['Content-Security-Policy']).toBeDefined()
  })
})
