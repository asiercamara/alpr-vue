import { describe, it, expect } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import fc from 'fast-check'
import { usePlateStore } from '@/stores/plateStore'
import type { PlateTextResult } from '@/types/detection'

/**
 * Texts one or two edits apart, so groups form, merge and rename often. Grouping compares a
 * text with group keys only, so texts that are close to each other can still land in
 * different groups.
 */
const TEXTS = ['AAAAAA', 'AAAAAB', 'AAAABB', 'AAABBB', 'BBBBBB', 'AAAAAC', 'ABAAAA', 'BBBBBA']
const plateText = fc.constantFrom(...TEXTS)

/** 5,000 cases take about 2 s (4 s with coverage on): well over vitest's default 5 s margin. */
const PROPERTY_TIMEOUT = 30_000

type Command = { kind: 'add'; text: string } | { kind: 'edit'; pick: number; text: string }

const command: fc.Arbitrary<Command> = fc.oneof(
  fc.record({ kind: fc.constant('add' as const), text: plateText }),
  fc.record({ kind: fc.constant('edit' as const), pick: fc.nat(50), text: plateText }),
)

function makePlate(id: string, text: string, timestamp: Date) {
  return {
    id,
    text,
    confidence: 0.9,
    plateText: { text, confidence: Array(6).fill(0.9) } as PlateTextResult,
    timestamp,
    croppedImage: null,
    boundingBox: null,
  }
}

/** What must hold after any sequence of adds and edits; one message per broken rule. */
function brokenRules(store: ReturnType<typeof usePlateStore>): string[] {
  const broken: string[] = []
  const groups = Object.entries(store.plateGroups)
  const grouped = groups.flatMap(([, group]) => group.variants.map((v) => v.id))

  if (grouped.length !== store.plates.length)
    broken.push(`${store.plates.length} plates but ${grouped.length} in groups`)
  if (new Set(grouped).size !== grouped.length) broken.push('a plate is in two groups')

  for (const [key, group] of groups) {
    if (group.mainText !== key) broken.push(`key ${key} but mainText ${group.mainText}`)
    if (group.totalOccurrences !== group.variants.length)
      broken.push(
        `${key}: totalOccurrences ${group.totalOccurrences}, ${group.variants.length} variants`,
      )
    const counted = group.variantTexts.reduce((sum, v) => sum + v.occurrences, 0)
    if (counted !== group.variants.length)
      broken.push(`${key}: variantTexts add up to ${counted}, ${group.variants.length} variants`)
  }
  return broken
}

describe('plateStore grouping (properties)', () => {
  it(
    'keeps every plate in exactly one group, with consistent counts',
    () => {
      fc.assert(
        fc.property(fc.array(command, { minLength: 1, maxLength: 60 }), (commands) => {
          setActivePinia(createPinia())
          const store = usePlateStore()
          store.setMode('upload')

          let added = 0
          let clock = 1_700_000_000_000
          for (const step of commands) {
            if (step.kind === 'add') {
              store.addPlate(makePlate(`p${added++}`, step.text, new Date((clock += 1000))))
            } else if (store.plates.length > 0) {
              store.updatePlateText(store.plates[step.pick % store.plates.length].id, step.text)
            }
            expect(brokenRules(store)).toEqual([])
          }
        }),
        { numRuns: 5000 },
      )
    },
    PROPERTY_TIMEOUT,
  )

  it(
    'keeps every plate in a group when only adding',
    () => {
      fc.assert(
        fc.property(fc.array(plateText, { minLength: 1, maxLength: 60 }), (texts) => {
          setActivePinia(createPinia())
          const store = usePlateStore()
          store.setMode('upload')

          let clock = 1_700_000_000_000
          texts.forEach((text, i) => {
            store.addPlate(makePlate(`p${i}`, text, new Date((clock += 1000))))
            expect(brokenRules(store)).toEqual([])
          })
        }),
        { numRuns: 5000 },
      )
    },
    PROPERTY_TIMEOUT,
  )
})
