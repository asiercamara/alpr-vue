import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'

/**
 * Runs axe-core (WCAG 2.0/2.1/2.2 A and AA) and returns the serious and
 * critical violations in a compact, readable shape. Empty means pass.
 */
export async function seriousViolations(page: Page, exclude: string[] = []) {
  let builder = new AxeBuilder({ page }).withTags([
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
    'wcag22aa',
  ])
  for (const selector of exclude) builder = builder.exclude(selector)
  const results = await builder.analyze()

  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({
      rule: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.slice(0, 3).map((n) => ({
        target: n.target.join(' '),
        why: n.any[0]?.message?.slice(0, 160),
      })),
    }))
}
