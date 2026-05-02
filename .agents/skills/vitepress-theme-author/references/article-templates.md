# Article Templates

Five ready-to-adapt skeletons for common article types. Pick the closest match, then trim or rearrange. Don't add components a section doesn't actually need — empty scaffolding is worse than plain prose.

## 1. Quickstart / Getting Started

Best for: install + first-run pages.

````md
---
title: Getting Started
description: Add the theme to a VitePress site and render your first page.
---

A short paragraph stating what the reader will have working after this guide and the time it should take.

## Prerequisites

<VTDocSteps type="bullet">
  <VTDocStep title="Node.js ≥ 18">

    Required by VitePress and the theme.

  </VTDocStep>
  <VTDocStep title="An existing VitePress site">

    The theme wraps a site — it does not scaffold one.

  </VTDocStep>
</VTDocSteps>

## Install

<VTDocTabs>
  <VTDocTab title="pnpm">

```bash
pnpm add vitepress-theme-app-docs
```
````

  </VTDocTab>
  <VTDocTab title="npm">

```bash
npm install vitepress-theme-app-docs
```

  </VTDocTab>
  <VTDocTab title="yarn">

```bash
yarn add vitepress-theme-app-docs
```

  </VTDocTab>
</VTDocTabs>

## Wire up the theme

<VTDocSteps>
  <VTDocStep title="Re-export the theme">

    In `.vitepress/theme/index.ts`, re-export the package theme.

  </VTDocStep>
  <VTDocStep title="Author your first page">

    Drop a `VTDocTip` or a `VTDocSteps` directly in any Markdown file.

  </VTDocStep>
</VTDocSteps>

<VTDocCheck>

Run `pnpm dev` and open the page — components should render with the theme's styling.

</VTDocCheck>

## Next steps

<VTDocCardGroup :cols="2">
  <VTDocCard title="Components" icon="sliders" href="/guide/components">

    Browse the full component reference.

  </VTDocCard>
  <VTDocCard title="i18n" icon="language" href="/guide/i18n">

    Configure locale routing.

  </VTDocCard>
</VTDocCardGroup>
```

## 2. Reference Page (per-component or per-API)

````md
---
title: VTDocTabs
description: Group equivalent content (package managers, OSes, languages) under switchable labels.
---

A one-paragraph summary of what the component does and when to use it.

## Props

| Prop      | Type                                    | Default       | Notes              |
| --------- | --------------------------------------- | ------------- | ------------------ |
| `variant` | `'underline' \| 'pills' \| 'segmented'` | `'underline'` | Visual style only. |

## Examples

### Default underline

<VTDocTabs>
  <VTDocTab title="pnpm">

```bash
pnpm add vitepress-theme-app-docs
```
````

  </VTDocTab>
  <VTDocTab title="npm">

```bash
npm install vitepress-theme-app-docs
```

  </VTDocTab>
</VTDocTabs>

### Pills

<VTDocTabs variant="pills"> ... </VTDocTabs>

## Caveats

<VTDocWarning>

Tab titles must be unique within the same `VTDocTabs`.

</VTDocWarning>

<VTDocInfo>

Tabs support full keyboard navigation — arrow keys cycle between tab buttons.

</VTDocInfo>
```

## 3. FAQ

````md
---
title: FAQ
description: Common questions about installing, extending, and shipping the theme.
---

<VTDocAccordionGroup>
  <VTDocAccordion title="Are the components auto-registered?">

    Yes. The theme registers them in `enhanceApp`, so any `.md` file can use them without imports.

  </VTDocAccordion>
  <VTDocAccordion title="Can I extend the theme with my own enhancements?">

    Yes — use `extends` in your local theme entry and re-call the original `enhanceApp`.

  </VTDocAccordion>
  <VTDocAccordion title="Does the theme also style raw Mermaid fences?">

    Yes. Plain ` ```mermaid ` fences pick up the toolbar and fullscreen handling automatically.

  </VTDocAccordion>
</VTDocAccordionGroup>
````

## 4. Comparison / Decision Page

```md
---
title: Choosing a Step Variant
description: When to use decimal, alpha, or bullet step markers.
---

A one-paragraph framing of the decision.

## At a glance

| Variant             | Use for                                    | Avoid when                     |
| ------------------- | ------------------------------------------ | ------------------------------ |
| `decimal` (default) | Ordered procedure (do A, then B, then C).  | The items are interchangeable. |
| `alpha`             | Labeled alternatives (Option A / B / C).   | Items have a real order.       |
| `bullet`            | Unordered prerequisites or considerations. | The list has only one item.    |

## Examples

### Decimal — install procedure

<VTDocSteps>
  <VTDocStep title="Install the package">

    …

  </VTDocStep>
  <VTDocStep title="Wire up the theme entry">

    …

  </VTDocStep>
</VTDocSteps>

### Alpha — package manager choice

<VTDocSteps type="alpha">
  <VTDocStep title="Option A — pnpm">

    Faster installs and strict hoisting.

  </VTDocStep>
  <VTDocStep title="Option B — npm">

    Default toolchain.

  </VTDocStep>
</VTDocSteps>

### Bullet — prerequisites

<VTDocSteps type="bullet">
  <VTDocStep title="Node.js ≥ 18">

    Required by VitePress.

  </VTDocStep>
  <VTDocStep title="An existing VitePress site">

    The theme does not scaffold one.

  </VTDocStep>
</VTDocSteps>
```

## 5. Troubleshooting

```md
---
title: Troubleshooting
description: Diagnose and fix common issues running the theme.
---

A short framing line on the kinds of problems this page covers.

## Components don't render

<VTDocWarning>

Check that your local `.vitepress/theme/index.ts` re-exports the package theme. If you wrap it, you must re-call the original `enhanceApp`.

</VTDocWarning>

## Code blocks inside tabs render as raw text

<VTDocTip>

Add a blank line between the opening `<VTDocTab ...>` and the fence, and another between the closing fence and `</VTDocTab>`. The Markdown parser needs the blank line to enter code-block mode.

</VTDocTip>

## Mermaid diagrams print blurry

<VTDocInfo>

The theme re-renders diagrams on the `vtdoc:before-print` event for a high-resolution snapshot. If you bypass the integrated print button (e.g. via the OS print dialog), the re-render won't fire.

</VTDocInfo>

## Still stuck?

<VTDocAccordionGroup>
  <VTDocAccordion title="Where do I file an issue?">

    Open one in the `vitepress-theme-app-docs` GitHub repository with a minimal reproduction.

  </VTDocAccordion>
  <VTDocAccordion title="How do I get debug output?">

    Pass `showBadge` to `VTDocDiagramPresenter` to print the detected adapter while authoring.

  </VTDocAccordion>
</VTDocAccordionGroup>
```
