# Improvement Checklist

Use this when rewriting an existing `.md` article to use theme components. The goal is **clarity per scroll inch**, not maximum component density. Every change should answer "does this make the reader's job easier?".

## Before you touch anything

1. **Read the whole article once.** Note the article's purpose: tutorial, reference, FAQ, comparison, troubleshooting. The right components depend on the genre.
2. **Check the frontmatter.** Add `title` and `description` if missing — they drive the auto-rendered `VTDocPageHeader` and SEO metadata.
3. **Preserve voice and meaning.** Do not paraphrase; do not invent facts. If a sentence is unclear, mark it for the user instead of guessing.

## Structural cues — what to look for

Apply each only when the cue is genuinely present.

| If the source has…                                                                          | Consider rewriting it as…                                                          |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| A blockquote labeled "Note:", "Tip:", "Warning:", "Important:"                              | The matching `VTDocNote` / `VTDocTip` / `VTDocWarning` / `VTDocInfo` callout.      |
| "After this you should see…" / "Verify that…"                                               | `VTDocCheck`.                                                                      |
| Numbered list of actions ("1. install … 2. configure … 3. run …")                           | `VTDocSteps` with `VTDocStep` children.                                            |
| A list of mutually-exclusive options ("you can either … or …")                              | `VTDocSteps type="alpha"`.                                                         |
| Bullet list of prerequisites ("you need …, …, …")                                           | `VTDocSteps type="bullet"`.                                                        |
| Two or three code blocks for the same task in different package managers / OSes / languages | `VTDocTabs` with one `VTDocTab` per variant.                                       |
| FAQ section, "common questions" with H3 headings                                            | `VTDocAccordionGroup` + `VTDocAccordion`.                                          |
| A landing/index page with internal links bulleted                                           | `VTDocCardGroup` + `VTDocCard` (use the icon enum; pick the closest icon or omit). |
| A section that reads "see also … see also … see also"                                       | A `VTDocCardGroup` of follow-up entry points.                                      |
| A complex Mermaid diagram already explained step-by-step in prose                           | `VTDocDiagramPresenter` with `phaseNav` or `autoPlay="intersect"`.                 |
| A high-level overview / topic map with hierarchical headings                                | `VTDocMindmap`.                                                                    |

## Things NOT to do

- **Don't promote every paragraph into a callout.** Three callouts in a row = no callout — the reader filters them out.
- **Don't convert a list with one item into a `VTDocSteps`.** A list of one is just a paragraph.
- **Don't replace simple bullet lists with cards.** Cards are heavyweight navigation; bullets are fine for inline lists.
- **Don't add `VTDocWarning` to soften optional advice.** Reserve warnings for real consequences.
- **Don't add `<script setup>` blocks unless you're inserting a `VTDocDiagramPresenter` or `VTDocMindmap`.** The other components don't need it.
- **Don't reorder headings or restructure the page** beyond what the component swap requires. Keep diffs surgical.
- **Don't introduce icons that aren't in the enum.** If none fit (`camera`, `image`, `video`, `list-check`, `rocket`, `browser`, `file-csv`, `gear`, `language`, `pen`, `shield-halved`, `sliders`, `sun`, `upload`), omit `icon`.
- **Don't duplicate content into both Spanish and English** unless the user asked. If `docs/es/<same-path>.md` exists, ask whether to mirror the change.

## Common formatting traps

- **Blank lines inside every component slot are mandatory.** Even a one-line callout breaks the build if the line contains an inline backtick mention of a tag. `markdown-it` enters Markdown-parsing mode inside an HTML block only when it sees a blank line. Without it, backticks stay literal, `<VTDocTip>`-style mentions are seen as real components, and Vue fails with _"Element is missing end tag"_ / _"Etiqueta no cerrada: `<tag>`"_. Always: blank line after opening tag, blank line before closing tag.
- **Literal HTML/XML tags shown as text must be backticked or fenced.** This is the single most common breakage. `<div>`, `<VTDocNote>`, an XML config sample written in prose will be parsed as a real component or HTML element, swallow content, and either render nothing or break the page. Fix: wrap in inline backticks (`` `<div>` ``) or in a fenced code block (` ```html ` / ` ```xml ` / ` ```md `). Self-closing tags (`<my-tag />`) need the same treatment.
- **Lists inside a component slot: flush-left at column 1 is the safest choice and always works.** You _can_ keep the list indented to match the surrounding tag (e.g. all content at 2 spaces, sub-items at 4 spaces) and `markdown-it` will accept it — but only if you stay below the 4-space-from-column-1 cliff and keep nested items exactly 2 spaces beyond their parent. If a build breaks with _"Element is missing end tag"_ near a nested list, move the list flush-left to remove the variable. Always: blank line after the opening tag, blank line before the closing tag.
- **Code fences inside `VTDocTab`** need a blank line before the opening fence and after the closing fence, otherwise the parser leaves the fence as raw text.
- **Vue prop binding for numeric props** uses `:cols="3"`, not `cols="3"`. (`cols="3"` works because the prop type is `string | number`, but prefer the bind form for clarity.)
- **Slot Markdown needs blank lines around block elements.** Lists, code blocks, and tables inside a component slot must be flanked by blank lines.
- **Tab titles must be unique** within a `VTDocTabs`.
- **Step titles can repeat** but it confuses readers; vary them.

### Quick examples — HTML/XML inside slots

Bad (the literal tags will be parsed as real components):

```md
<VTDocNote>
You can wrap content in <VTDocTip> or <VTDocWarning> depending on tone.
Configure with <root><item value="1"/></root>.
</VTDocNote>
```

Good (inline backticks for short references, fence for blocks):

````md
<VTDocNote>
You can wrap content in `<VTDocTip>` or `<VTDocWarning>` depending on tone.
Configure with the following XML:

```xml
<root>
  <item value="1" />
</root>
```

</VTDocNote>
````

### Quick examples — lists inside slots

Bad (list collapses or renders as code):

```md
<VTDocTip>
    - first item
    - second item
</VTDocTip>
```

Good:

```md
<VTDocTip>

- first item
- second item
  - nested item
- third item

</VTDocTip>
```

## Final pass

Before handing the result back:

1. Read the rewritten article top-to-bottom as a reader. If a component feels like decoration, remove it.
2. Verify every component tag has its required prop (`title` on `VTDocStep` / `VTDocTab` / `VTDocAccordion` / `VTDocCard`; `code` on `VTDocDiagramPresenter` / `VTDocMindmap`).
3. Verify icons are in the allowed enum.
4. Verify the article still answers the question it was written to answer.
5. If you removed or restructured content, surface that to the user — don't bury it in the diff.
