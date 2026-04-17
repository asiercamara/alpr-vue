---
title: 'Troubleshooting ALPR Vue Issues'
description: 'Fix common ALPR Vue problems: camera permission errors, model loading failures, missed or garbled detections, slow performance, and settings not saving.'
---

If something isn't working as expected, start here. Most issues fall into a handful of categories — camera permissions, the AI model loading, detection quality, or browser support. Work through the relevant section below, and if the problem persists, check the browser console (press F12 and open the **Console** tab) for any error messages that can help narrow things down.

<AccordionGroup>
  <Accordion title="Camera won't start / 'Camera access denied'">
    Camera errors are almost always caused by a missing permission, an insecure page URL, or a system-level block.

    **Check the browser permission:**
    Your browser may have blocked the camera when you first visited the page. Look for a camera icon in the address bar, click it, and select **Allow**. Then refresh the page and try starting the camera again.

    **Check system privacy settings (mobile):**
    On iOS, go to **Settings > Privacy & Security > Camera** and make sure your browser app is listed and enabled. On Android, go to **Settings > Apps > [your browser] > Permissions** and allow Camera.

    **Verify you are on HTTPS or localhost:**
    Browsers only allow camera access in a secure context. If the URL in your address bar starts with `http://` (not `https://`), camera access is blocked by the browser itself. Use the `https://` version of the URL, or access the app on `localhost` during local testing.

    <Warning>
      Even if you previously allowed the camera, some browsers reset permissions when you clear site data or switch to a private browsing window.
    </Warning>

  </Accordion>

  <Accordion title="'Model loading' spinner that never goes away">
    The first time you open ALPR Vue, the app downloads the ONNX AI model files (several megabytes). On a slow connection this can take a minute or two before the spinner disappears.

    **Wait and retry:**
    Give it a moment, then refresh the page. On most connections the models load within 10–30 seconds. Once cached by your browser, subsequent loads are near-instant.

    **Check for extensions blocking WebAssembly:**
    Security-focused browser extensions (ad blockers, script blockers, or strict CSP extensions) can prevent WebAssembly from running. Try disabling extensions one by one, or open the app in a fresh private window with extensions disabled.

    **Check the browser console:**
    Press **F12**, open the **Console** tab, and look for any red error messages. A `Failed to fetch` or `WebAssembly` error points to a network or browser compatibility issue.

    <Note>
      Model files are cached by your browser after the first successful load. If the spinner appeared once but the app worked on your next visit, no further action is needed.
    </Note>

  </Accordion>

  <Accordion title="No plates detected">
    If the camera starts and scanning appears active, but no plates appear in your history, a few factors could be responsible.

    **Improve visibility and lighting:**
    Make sure the plate is clearly visible in the frame, well-lit, and not blurry. The model reads plates best under consistent lighting — avoid shooting directly into bright sunlight or in very dim conditions.

    **Hold the camera steady:**
    The app requires the same plate to be detected continuously for at least 3 seconds before saving it to history. If the camera moves around too much, the plate may not stay in frame long enough to be confirmed.

    **Lower the Confidence Threshold:**
    Open **Settings** (gear icon in the header) and lower the **Confidence Threshold** from its default of 0.7. Trying a value of 0.6 or 0.5 may allow more marginal detections through.

    **Consider regional limitations:**
    The AI models are optimized for European license plates. Plates from other regions may be detected with lower accuracy or not at all. See [how the AI models work](/how-it-works) for more detail.

    **Try uploading a photo instead:**
    If live camera detection isn't working, try using the **Upload File** button to process a still image of the plate. This rules out camera-related issues and gives the model more processing time per frame. See [uploading files](/upload-files) for instructions.

    <Tip>
      A straight-on view of the plate at close range gives the best detection results. Extreme angles, rain-streaked plates, or partial obstructions significantly reduce accuracy.
    </Tip>

  </Accordion>

  <Accordion title="Plates detected but text is wrong or garbled">
    The OCR model reads characters one at a time and assigns a confidence score to each. Low-contrast, dirty, or partially covered plates often result in one or more characters being misread.

    **Edit the plate text manually:**
    Tap any plate in your history list to open its detail view, then tap **Edit** to correct any misread characters. Your correction is saved immediately.

    **Read the confidence bars:**
    In the plate detail view, each character has its own confidence bar. Characters shown in red have low confidence and are the most likely to be incorrect — focus your review there.

    **Improve the source image:**
    If accuracy is consistently poor, try capturing the plate in better lighting, at a closer distance, and with a straighter angle. Even a slight tilt can cause the OCR model to misread a character.

    <Note>
      Some OCR errors are expected, especially for low-contrast, dirty, or aged plates. Manual editing is the intended way to correct them.
    </Note>

  </Accordion>

  <Accordion title="Poor performance — app is slow or laggy">
    ALPR Vue runs two AI models locally, which is CPU and GPU intensive. Performance depends heavily on your device's processing power.

    **Free up device resources:**
    Close other browser tabs, background apps, and any other memory-intensive processes. The more resources your device can dedicate to the app, the better.

    **Give it a moment to warm up:**
    The app runs AI inference in a background Web Worker thread so the UI stays responsive. On the first detection after opening the app, there may be a brief delay while the models initialize — this is normal and improves after the first few frames.

    **Use a supported browser:**
    Chrome and Edge generally offer the best WebAssembly performance. If you are using a different browser and experiencing lag, try switching. See [browser requirements](/browser-requirements) for the full compatibility list.

    **Understand device limits:**
    On older or lower-powered devices — particularly budget smartphones — the models may run slowly regardless of optimizations. In this case, consider using the **Upload File** mode instead of live camera, which processes each frame at its own pace without a real-time constraint.

  </Accordion>

  <Accordion title="Export CSV is empty or missing plates">
    The **Export CSV** button exports only the plates currently shown in your history list.

    **Make sure detections were confirmed:**
    A plate must be detected continuously for the full confirmation window (3 seconds by default, or 1 second for high-confidence detections) before it is saved to history. Plates that appear briefly on screen but were not confirmed will not appear in the list or the export.

    **Check the history list:**
    Scroll through the **Detected Plates** panel to confirm the plates you expect are shown. If the list is empty, no plates have been confirmed in the current session.

    **Re-run detection if needed:**
    If you cleared history before exporting, tap **Clear** in the history panel and run another detection session. Once plates appear in the list, use **Export CSV** to download them.

    See [exporting data](/exporting-data) for full details on the CSV format and what each column contains.

  </Accordion>

  <Accordion title="Settings not saving between sessions">
    ALPR Vue saves your settings automatically to your browser's `localStorage`. If settings appear to reset every time you open the app, one of the following is likely the cause.

    **Avoid private or incognito mode:**
    Most browsers prevent `localStorage` writes in private browsing mode, which means settings are lost when you close the tab. Switch to a regular browser window to persist settings between sessions.

    **Check browser storage permissions:**
    Some browsers or extensions block `localStorage` writes, especially in strict privacy or cookie-blocking modes. Check your browser's site settings and ensure storage is not blocked for this site.

    **Do not clear site data between visits:**
    Clearing your browser's site data (cookies, cache, storage) deletes saved settings. If you use a browser extension that automatically clears site data, add an exception for the ALPR Vue site.

    <Note>
      Settings are stored locally in your browser, not in any cloud account. They are not shared between devices or browser profiles.
    </Note>

  </Accordion>
</AccordionGroup>
