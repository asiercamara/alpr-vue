---
title: 'View and Edit Detected License Plates'
description: "Browse your detection history, inspect per-character confidence scores, correct misread plates, copy text to clipboard, and clear results when you're done."
---

Every plate the app detects is saved to the **Detected Plates** panel, which appears below the camera preview (or alongside it on larger screens). From here you can review what was found, inspect how confident the AI was about each character, fix any mistakes, and copy or clear results as needed.

## Plate history list

The history list shows all confirmed detections sorted with the most recent at the top. Each entry in the list displays:

- **Plate text** — the recognized alphanumeric string, using a monospace plate font.
- **Confidence ring** — a circular indicator showing the overall OCR confidence for that detection.
- **Timestamp** — the date and time the plate was detected.

A count badge next to the "Detected Plates" heading shows how many plates are currently in the list.

## Plate detail modal

Click or tap any plate in the list to open its detail view. The modal shows:

- **Cropped plate image** — a close-up of the detected plate region extracted from your image or video frame.
- **Plate text** — large, clearly readable characters at the top of the modal.
- **Overall confidence** — the mean OCR confidence across all characters, shown as a percentage alongside a confidence ring.
- **Character-by-character confidence bars** — a bar for each character showing exactly how confident the model was about that letter or digit (see the note below for color meanings).
- **Detection timestamp** — the exact date and time of the detection.
- **Detection ID** — a short unique identifier for the record.

<Info>
  Confidence bars are color-coded by accuracy level: **green** for very high confidence (≥ 90%), **light green** for high (≥ 75%), **yellow** for medium (≥ 60%), **orange** for low (≥ 45%), and **red** for very low confidence. Characters shown in red are the most likely to contain a misread.
</Info>

## Editing a plate

If the AI misread a character, you can correct it directly in the app.

<Steps>
  <Step title="Open the plate detail">
    Click or tap the plate you want to edit in the history list.
  </Step>
  <Step title="Click Edit">
    Click the **Edit** button (pencil icon) next to the plate text in the modal.
  </Step>
  <Step title="Correct the text">
    The plate text becomes an editable field. Type your corrections. The field accepts up to 12 characters.
  </Step>
  <Step title="Save your changes">
    Click the **Save** button (checkmark) or press **Enter** to confirm. Click the **Cancel** button or press **Escape** to discard.
  </Step>
</Steps>

## Copying to clipboard

To copy a plate's text without editing it:

1. Open the plate detail modal.
2. Click the **Copy** button (clipboard icon) next to the plate text.

The text is copied to your clipboard and ready to paste anywhere.

## Clearing history

To remove all detections at once, click the **Clear** button in the plate history panel header. This immediately removes every plate from the list. This action cannot be undone, so export your data first if you need to keep it.

## Toast notifications

Each time the app confirms a new plate detection, a brief notification appears at the bottom of the screen showing the recognized plate text. It disappears automatically after a moment. This lets you keep your eyes on the camera view without needing to check the history list.
