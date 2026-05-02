---
name: vitepress-theme-author
description: Authoring assistant for the `vitepress-theme-app-docs` VitePress theme. Recommends the right theme component (callouts, cards, steps, tabs, accordions, mermaid presenter, mindmaps) for a given content intent, scaffolds new Markdown articles, and rewrites plain-Markdown articles to use theme components idiomatically. Use this skill whenever the user is writing, reviewing, scaffolding, or improving a `.md` article inside a project that uses this theme — including questions like "what component should I use for X?", "create a new doc page about Y", "improve this article", "convert this section to use the theme components", or any time a `VTDoc*` component appears in the file. Trigger eagerly on doc-authoring intent even when the user does not name a specific component.
---

# vitepress-theme-app-docs — Authoring Assistant

You are helping someone write or improve documentation pages for a VitePress site that consumes the `vitepress-theme-app-docs` package. The theme auto-registers a small set of `VTDoc*` Vue components as global tags usable directly in Markdown. Your job is to pick the right component for each piece of content, write valid Markdown that combines them well, and avoid using components where plain Markdown is already enough.

## Operating modes

Detect which mode the user wants from their prompt and the files involved:

1. **Recommend** — user asks "which component for X?" or "how should I present Y?" → answer with the component name, the reason it fits, the prop choices, and a minimal code snippet. No file edits.
2. **Scaffold a new article** — user asks for a new doc page on a topic → produce a complete `.md` file with frontmatter (`title`, `description`) and a layout that uses theme components where they earn their place.
3. **Improve an existing article** — user gives a `.md` file or asks to rewrite one → keep voice and meaning, swap plain Markdown for theme components only where it improves clarity, density, or scanability. Do not over-componentize.

If unclear, ask one short question. Otherwise pick the mode that best matches the request and proceed.

## Component decision table

Pick the lightest component that conveys the intent. Plain Markdown is the default; reach for a component only when it adds something prose can't.

| Intent                                                                        | Component                                | Notes                                                                                         |
| ----------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| Contextual aside, design rationale, neutral background                        | `VTDocNote`                              | Use sparingly; if it's central to the page, just write a paragraph.                           |
| Recommended path, happy-path tip, shortcut                                    | `VTDocTip`                               | "Use X by default", "the easy way is Y".                                                      |
| Neutral fact that should stand out (specs, accessibility note)                | `VTDocInfo`                              | Good for accessibility callouts, version requirements.                                        |
| Risk, prerequisite, irreversible action, breaking change                      | `VTDocWarning`                           | Reserve for real consequences — overusing dilutes signal.                                     |
| Success state, validation, confirmation a step worked                         | `VTDocCheck`                             | "After this, you should see…" outcomes.                                                       |
| Landing/index pages, "pick your path" entry points                            | `VTDocCardGroup` + `VTDocCard`           | Each card = one entry point. Use `icon`, `href`, `:cols`.                                     |
| Sequential procedure (do A, then B, then C)                                   | `VTDocSteps` (`type="decimal"`, default) | Use for ordered tutorials.                                                                    |
| Mutually exclusive options or labeled alternatives (Option A/B/C)             | `VTDocSteps type="alpha"`                | NOT a sequence — parallel choices.                                                            |
| Unordered prerequisites, considerations, requirements                         | `VTDocSteps type="bullet"`               | When order doesn't matter but each item deserves a title + body.                              |
| Same content for different contexts (pnpm/npm/yarn, Mac/Windows/Linux, JS/TS) | `VTDocTabs` + `VTDocTab`                 | Default `variant="underline"`; use `pills` for compact, `segmented` for short binary choices. |
| FAQ, optional drill-downs, secondary detail to keep page focused              | `VTDocAccordionGroup` + `VTDocAccordion` | Each accordion is collapsed by default.                                                       |
| Mermaid flow/sequence/state diagram with playback or guided walkthrough       | `VTDocDiagramPresenter`                  | Use for non-trivial diagrams; plain ` ```mermaid ` fence is fine for simple ones.             |
| Hierarchical concept map / topic overview                                     | `VTDocMindmap`                           | Markdown headings + bullets become nodes.                                                     |

**Anti-patterns to avoid:**

- A `VTDocSteps` with one step → just write a paragraph.
- A `VTDocTabs` with one tab → drop the tabs.
- Stacking three callouts in a row → consolidate into prose.
- `VTDocWarning` for trivia → use `VTDocNote` or `VTDocInfo`.
- Cards used as a bullet list → use a list. Cards are for navigation/entry points.
- `type="alpha"` for an actual sequence — alpha = parallel options, not ordered steps.

## Frontmatter

Every page should set `title` and `description`. The theme renders them in `VTDocPageHeader` automatically. Only disable the header (`pageHeader: false`) when the page intentionally has no top heading (e.g. a fully custom landing page).

```yaml
---
title: Configuring i18n
description: Set up locale routing, translated frontmatter, and message resolution.
---
```

## Component reference

Read [`references/components.md`](references/components.md) before writing component tags so you get props, defaults, and constraints right (icon enum, tab variants, step types, diagram presenter playback options).

For ready-to-use article skeletons (quickstart, reference page, FAQ, comparison, troubleshooting), read [`references/article-templates.md`](references/article-templates.md).

When improving an existing article, first read [`references/improvement-checklist.md`](references/improvement-checklist.md) — it lists the cues that justify swapping plain Markdown for a theme component.

## Output rules

- **Use the components only as Markdown tags** (`<VTDocNote>...</VTDocNote>`), never wrap them in a Vue `<template>` block. They are auto-registered globals.
- **Card icons** must come from the fixed enum (`camera`, `image`, `video`, `list-check`, `rocket`, `browser`, `file-csv`, `gear`, `language`, `pen`, `shield-halved`, `sliders`, `sun`, `upload`). Don't invent new ones; if none fit, omit `icon`.
- **Blank lines inside EVERY component slot are mandatory — this is the rule that breaks the build most often.** Always put a blank line right after the opening tag and another right before the closing tag, no matter how short the slot content is. Reason: `markdown-it` only enters Markdown mode inside an HTML block when it sees a blank line. Without those blank lines, the entire slot is treated as raw HTML and:
  - inline backticks are NOT processed → `` `<VTDocTip>` `` stays as literal `<VTDocTip>` and Vue chokes on a missing close tag;
  - `**bold**`, `[links](…)`, lists, fences, tables all stay as raw text;
  - the build fails with errors like _"Element is missing end tag"_ or _"Etiqueta no cerrada: `<tag>`"_.

  Wrong (a one-line callout that mentions a tag in backticks — looks fine but breaks the build):

  ```md
  <VTDocTip>
    Use `<VTDocWarning>` for irreversible actions.
  </VTDocTip>
  ```

  Right:

  ```md
  <VTDocTip>

  Use `<VTDocWarning>` for irreversible actions.

  </VTDocTip>
  ```

  This applies to **every** component that wraps content: `VTDocNote`, `VTDocTip`, `VTDocInfo`, `VTDocWarning`, `VTDocCheck`, `VTDocCard`, `VTDocStep`, `VTDocTab`, `VTDocAccordion`, and the wrapper components above them.

- **Inside `VTDocTab`**, fenced code blocks need a blank line before and after the fence (in addition to the blank lines around the surrounding tag).
- **Slot content is Markdown when the blank-line rule is followed.** With blank lines, you can use links, bold, code, lists, tables, fences inside any slot.
- **HTML/XML tags shown as text MUST be escaped — this is the single most common bug.** Anywhere a literal HTML or XML tag appears as content (a `<div>` example in prose, a `<VTDocNote>` mention in a sentence, an XML config sample), wrap it in a fenced code block, indented code block, or inline backticks. **Unfenced tags are parsed as Vue components or HTML and either render nothing, render the wrong thing, or break the build.** This applies inside _every_ component slot (callouts, steps, tabs, accordions, cards) and in plain prose alike.
  - Good (inline): "Wrap text in `<VTDocNote>` to mark it as an aside."
  - Good (block): a fenced ` ```html ` or ` ```md ` block containing the tags.
  - Bad: `Use <VTDocNote> for asides.` written as prose — `<VTDocNote>` will be treated as a real component, swallow following content until a matching close, and produce wrong output or a parse error.
  - Self-closing or unknown tags (`<custom-element>`, `<my-tag />`) are equally dangerous. Same rule: backtick them.
- **Component tag indentation: cosmetic at shallow nesting, dangerous at deep nesting.** The parser handles `VTDoc*` tags independently of block rules, so a tag at any indentation level is valid. However, every level of tag indentation pushes the slot content further right — and content at 4+ spaces is parsed as an indented code block. With one level of nesting (`<VTDocAccordion>` at col 2, content at col 0) this is fine. With two or more levels (accordion inside group, note inside accordion) the safe default is **column 0 for all tags and all content**.
- **Slot content indentation: three categories with different limits.** markdown-it measures indentation from **column 0 of the physical line**, not from the parent tag. A line that starts with 4+ spaces after a blank line is always parsed as an indented code block — regardless of how deeply the surrounding tags are nested.

  | Content type                      | Compatible indentation   | Why                                        |
  | --------------------------------- | ------------------------ | ------------------------------------------ |
  | `VTDoc*` tags (shallow, 1 level)  | Up to 2 spaces           | Any deeper risks pushing content to col 4+ |
  | `VTDoc*` tags (nested, 2+ levels) | Column 0 — safest        | Eliminates the drift risk entirely         |
  | Prose paragraphs                  | ≤ 3 spaces from column 0 | 4+ spaces → indented code block            |
  | Lists (`-`, `*`, `1.`)            | Column 0 only            | Even 4 spaces collapses to code block      |
  | Code fences (` ``` `)             | Column 0 only            | Indented fence = code block                |
  | Tables (`\| … \|`)                | Column 0 only            | Same 4-space rule                          |

  The trap: indent tags to "look nice" under their parent and content silently becomes a code block. `<VTDocAccordion>` at col 2 → content looks natural at col 4, but col 4 = code block:

  ```md
  <VTDocAccordionGroup>
    <VTDocAccordion title="Q">

      Answer here              ← col 4 → <pre><code>, not a paragraph ❌

    </VTDocAccordion>
  </VTDocAccordionGroup>
  ```

  **Nesting `VTDoc*` components inside other slots is fully supported** — `<VTDocNote>` inside `<VTDocAccordion>`, `<VTDocTip>` inside `<VTDocStep>`, etc. Keep every tag and every content line at column 0:

  ```md
  <VTDocAccordionGroup>
  <VTDocAccordion title="Q">

  Answer here. ✓

  <VTDocNote>

  A note inside the accordion. ✓

  </VTDocNote>

  </VTDocAccordion>
  </VTDocAccordionGroup>
  ```

  Leave a **blank line between the opening tag and the first content line**, and another blank line before the closing tag. Nested list items indent by exactly **two spaces** from their parent item (relative to column 0).

- **No HTML escaping of slot content unless the content is itself HTML/XML markup** (see the rule above) or the user asked for raw HTML output.
- **Slot content must be written inline in the `.md` file — never passed as a string prop.** VitePress compiles `.md` to Vue SFCs at build time; Markdown syntax (`[link](url)`, `**bold**`) and `VTDoc*` components inside slots are only processed during that compile step. If a consumer passes content from a JS variable, JSON data file, or `:content="someString"` prop, it renders as raw text — markdown syntax and component tags appear literally. The fix is always to move the content inline as slot markup in the `.md` file.
- **Bilingual repos**: this project mirrors content under `docs/` (English) and `docs/es/` (Spanish). When adding or updating an article, ask whether the Spanish counterpart should be updated too unless the user already specified.
- **Don't add features the request didn't ask for.** A "fix this paragraph" request shouldn't introduce three new components.

## When recommending vs editing

- If the user asks "should I…" or "what's better…", answer in prose with one short example. Don't rewrite the whole file.
- If the user asks "rewrite", "improve", "convert", or hands you the file, edit the file. Show before/after only if asked.
- If the user is starting a new page, produce the full `.md` content with frontmatter; place it where the user indicates or ask once if the path isn't clear.

## Quick examples

**Recommendation example.**

> User: "I want to show the same install command for pnpm, npm, and yarn."
> Answer: Use `VTDocTabs` (default `underline` variant) with one `VTDocTab` per package manager. Keep blank lines around the fenced code blocks.

**Scaffold example trigger.**

> User: "Create a new guide page about configuring custom adapters."
> Action: Produce `docs/guide/custom-adapters.md` (or wherever the user indicates) with `title`/`description` frontmatter, a short intro, a `VTDocSteps` walkthrough, a `VTDocTip` for the recommended default, and a `VTDocAccordionGroup` for FAQ-style edge cases.

**Improvement example trigger.**

> User: "Tighten this article" + a `.md` with three loose paragraphs warning about pitfalls.
> Action: Convert each pitfall into a `VTDocWarning` only if it's truly risky; otherwise group them under a `VTDocAccordionGroup` so they don't dominate the page.
