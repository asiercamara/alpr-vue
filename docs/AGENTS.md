# Documentation project instructions

## About this project

- This is a documentation site for **ALPR Vue**, a browser-based automatic license plate recognition app
- Pages are MDX files with YAML frontmatter, built on [Mintlify](https://mintlify.com)
- Configuration lives in `docs.json`
- Run `mint dev` to preview locally
- Run `mint broken-links` to check links
- The live site is published at https://mintlify.wiki/asiercamara/alpr-vue
- The app itself is at https://alpr-vue.surge.sh

## Terminology

Use these terms consistently across all pages:

| Preferred                         | Avoid                                                                  |
| --------------------------------- | ---------------------------------------------------------------------- |
| license plate                     | number plate, plate number                                             |
| confidence score / confidence     | accuracy, certainty                                                    |
| confidence threshold              | minimum confidence, cutoff                                             |
| confirmation time                 | confirmation window, detection delay                                   |
| continuous mode                   | auto-repeat, loop mode                                                 |
| skip duplicates                   | deduplication, filter duplicates                                       |
| plate history / detection history | log, record list                                                       |
| plate detail view / detail modal  | popup, overlay                                                         |
| bounding box                      | detection box, frame, rectangle                                        |
| OCR                               | optical character recognition (spell out on first use in a page)       |
| ALPR                              | automatic license plate recognition (spell out on first use in a page) |
| Web Worker                        | worker thread, background thread                                       |
| WebAssembly                       | Wasm (avoid abbreviation in user-facing docs)                          |
| localStorage                      | local storage (always camelCase in code references)                    |
| ONNX                              | Open Neural Network Exchange (spell out on first use in a page)        |

In Spanish pages, use:
| English | Spanish preferred |
|---------|-------------------|
| license plate | matrícula |
| confidence score | puntuación de confianza |
| confidence threshold | umbral de confianza |
| confirmation time | tiempo de confirmación |
| continuous mode | modo continuo |
| skip duplicates | omitir duplicados |
| plate history | historial de matrículas |
| plate detail view | vista detallada de la matrícula |
| bounding box | recuadro de detección |
| settings | ajustes (not "configuración" for the panel name) |
| upload | subir / cargar (prefer "cargar" for files) |
| sample gallery | galería de muestras |

## Style preferences

- Use active voice and second person ("you" / "tú" or imperative form in Spanish)
- Keep sentences concise — one idea per sentence
- Use sentence case for headings (not title case)
- Bold for UI elements: Click **Start Camera**, tap **Export CSV**
- Code formatting for file names, commands, paths, setting keys, and localStorage references
- When describing a setting, always state its default value
- Do not document internal implementation details (worker internals, model architecture beyond what is shown in ai-models.mdx)
- Use Mintlify Note/Tip/Warning/Check callouts deliberately — not as decoration

## Content boundaries

Document:

- All user-facing features and settings
- Browser requirements and device compatibility
- How the two-stage AI pipeline works (at a conceptual level)
- Privacy guarantees and data handling
- Troubleshooting steps users can take themselves

Do NOT document:

- Internal Web Worker message protocol
- Model training details or dataset information beyond what is already in ai-models.mdx
- Deployment or self-hosting internals beyond what is in the GitHub README
- Code-level API (this is a UI app with no public JS API)
- Admin or developer-only workflows
