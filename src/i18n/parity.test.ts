import { describe, it, expect } from 'vitest'
import en from './locales/en'
import es from './locales/es'

/** Flattens a nested messages object into `a.b.c → string` entries. */
function flatten(node: unknown, prefix = ''): [string, string][] {
  if (typeof node === 'string') return [[prefix, node]]
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    flatten(value, prefix ? `${prefix}.${key}` : key),
  )
}

const enMessages = new Map(flatten(en))
const esMessages = new Map(flatten(es))

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
const pluralForms = (text: string) => text.split('|').length

describe('i18n locale parity (en ↔ es)', () => {
  it('defines the same keys in both languages', () => {
    const onlyEn = [...enMessages.keys()].filter((key) => !esMessages.has(key))
    const onlyEs = [...esMessages.keys()].filter((key) => !enMessages.has(key))

    expect({ onlyEn, onlyEs }).toEqual({ onlyEn: [], onlyEs: [] })
  })

  it.each([
    ['en', enMessages],
    ['es', esMessages],
  ] as const)('has no empty messages in %s', (_locale, messages) => {
    const empty = [...messages].filter(([, text]) => text.trim() === '').map(([key]) => key)

    expect(empty).toEqual([])
  })

  it('uses the same {placeholders} in both languages', () => {
    const mismatched = [...enMessages]
      .filter(
        ([key, text]) =>
          esMessages.has(key) &&
          placeholders(text).join() !== placeholders(esMessages.get(key)!).join(),
      )
      .map(([key]) => key)

    expect(mismatched).toEqual([])
  })

  it('has the same number of plural forms (| separated) in both languages', () => {
    const mismatched = [...enMessages]
      .filter(
        ([key, text]) =>
          esMessages.has(key) && pluralForms(text) !== pluralForms(esMessages.get(key)!),
      )
      .map(([key]) => key)

    expect(mismatched).toEqual([])
  })
})
