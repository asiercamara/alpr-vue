import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { buildSidebar } from '../../docs/.vitepress/sidebar'

const DOCS = resolve(process.cwd(), 'docs')

/** Not published pages: mirrors `srcExclude` in docs/.vitepress/config.ts. */
const EXCLUDED = /^(README(\.es)?|CONTRIBUTING|AGENTS)\.md$|^LICENSE$/

const pages = (dir: string) =>
  readdirSync(dir).filter((name) => name.endsWith('.md') && !EXCLUDED.test(name))

const enPages = pages(DOCS)
const esPages = pages(resolve(DOCS, 'es'))

describe('docs parity (docs/ ↔ docs/es/)', () => {
  it('has a Spanish page for every English page', () => {
    expect(enPages.filter((name) => !esPages.includes(name))).toEqual([])
  })

  it('has an English page for every Spanish page', () => {
    expect(esPages.filter((name) => !enPages.includes(name))).toEqual([])
  })
})

describe('docs sidebar', () => {
  it.each(['en', 'es'] as const)('only links to pages that exist (%s)', (locale) => {
    const base = locale === 'en' ? DOCS : resolve(DOCS, locale)
    const links = buildSidebar(locale).flatMap((section) => section.items.map((item) => item.link))
    const missing = links.filter(
      (link) => !existsSync(resolve(base, `${link.replace(`/${locale}`, '').slice(1)}.md`)),
    )

    expect(links.length).toBeGreaterThan(0)
    expect(missing).toEqual([])
  })

  it('lists every published page in both languages', () => {
    for (const locale of ['en', 'es'] as const) {
      const listed = buildSidebar(locale).flatMap((s) =>
        s.items.map((i) => i.link.split('/').pop()),
      )
      const published = (locale === 'en' ? enPages : esPages)
        .map((name) => name.replace(/\.md$/, ''))
        .filter((name) => name !== 'index')

      expect(published.filter((name) => !listed.includes(name))).toEqual([])
    }
  })
})
