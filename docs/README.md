# ALPR Vue — Documentation

This directory contains the Mintlify documentation site for [ALPR Vue](https://alpr-vue.surge.sh), a browser-based automatic license plate recognition app.

## Published site

**English:** https://mintlify.wiki/asiercamara/alpr-vue  
**Spanish:** https://mintlify.wiki/asiercamara/alpr-vue/es

## Structure

```
docs/
├── docs.json                # Mintlify configuration and navigation
├── *.mdx                    # English pages
└── es/
    └── *.mdx                # Spanish pages
```

Pages are written in MDX (Markdown + JSX). Navigation is defined in `docs.json` under the `languages` array.

## Local preview

Install the Mintlify CLI:

```bash
npm i -g mint
```

Then run from this directory:

```bash
mint dev
```

Preview is available at `http://localhost:3000`.

## Adding or editing pages

1. Fork and clone the repository
2. Edit the relevant `.mdx` file in `docs/` (English) or `docs/es/` (Spanish)
3. If adding a new page, register it in `docs.json` under the correct language navigation group
4. Run `mint dev` to preview your changes
5. Submit a pull request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for writing guidelines.

## AI-assisted editing

Install the Mintlify skill for Claude Code or other AI tools:

```bash
npx skills add https://mintlify.com/docs
```

## Checking for broken links

```bash
mint broken-links
```
