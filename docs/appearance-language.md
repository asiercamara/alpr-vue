---
title: 'Theme and Language Preferences'
description: 'How to switch between light, dark, and system theme modes and change the display language in ALPR Vue, with instant effect and no page reload required.'
---

The appearance and language settings control how ALPR Vue looks and which language it displays. You can choose a colour theme that suits your environment or matches your device, and you can switch the interface language at any time. Both settings take effect immediately — no page reload is needed. Open the **Settings panel** (gear icon in the header) to access them.

## Theme

ALPR Vue offers three theme modes. Select the one that best fits your working environment.

| Mode       | What it does                                                         |
| ---------- | -------------------------------------------------------------------- |
| **Light**  | Always uses the light interface, regardless of your device settings. |
| **Dark**   | Always uses the dark interface, regardless of your device settings.  |
| **System** | Follows your device or operating system preference automatically.    |

The default is **System**.

<Tip>
  The System theme is recommended for most users. When your device switches between light and dark mode — for example, at sunset via an automatic schedule — ALPR Vue switches with it, so you never have to adjust it manually.
</Tip>

### Flash-of-unstyled-content prevention

ALPR Vue applies your theme choice before the page finishes rendering. This means you will never see a white flash when loading the app in dark mode — the correct colours are in place from the very first frame.

## Language

ALPR Vue supports three language options.

| Option           | What it does                                                          |
| ---------------- | --------------------------------------------------------------------- |
| **Auto**         | Detects your preferred language from your browser's language setting. |
| **English (EN)** | Always displays the interface in English.                             |
| **Spanish (ES)** | Always displays the interface in Spanish.                             |

The default is **Auto**.

Switching languages takes effect immediately across the entire interface — buttons, labels, notifications, and settings descriptions all update at once.

<Note>
  The Auto option reads your browser's language preference (the `Accept-Language` setting). If your browser is configured for Spanish, ALPR Vue will use Spanish automatically. If your browser reports a language other than English or Spanish, the app falls back to English.
</Note>
