---
title: 'Get Started with ALPR Vue'
description: 'Detect your first license plate in minutes — open the app, grant camera access, point at a vehicle, and view the result with a confidence score.'
---

This guide walks you through detecting your first license plate with ALPR Vue. By the end, you'll have the camera running, a plate captured in the history list, and know how to inspect and copy the result.

## Detect a plate with the live camera

<Steps>
  <Step title="Open the app in a supported browser">
    Open ALPR Vue in a modern browser such as Chrome, Edge, Firefox, or Safari 16+. For the camera to work, the page must be served over **HTTPS or localhost** — this is a browser security requirement, not something specific to ALPR Vue. If you're accessing a self-hosted instance, make sure it uses a secure connection.

    Not sure your browser is supported? See [Supported Browsers and Device Requirements](/browser-requirements).

  </Step>
  <Step title="Grant camera permissions">
    Click **Start Camera**. Your browser will ask whether ALPR Vue can access your camera. Click **Allow**.

    <Tip>
      If you accidentally clicked **Block**, or if the permission prompt never appeared, you can reset it in your browser settings. In Chrome, click the lock icon in the address bar and set **Camera** to **Allow**. In Safari, go to **Settings → Websites → Camera** and allow access for the site. Then reload the page.
    </Tip>

  </Step>
  <Step title="Point the camera at a vehicle">
    Once the camera is active, hold your phone or position your webcam so the license plate is clearly visible. The app scans automatically — you don't need to press anything. A bounding box appears on screen when a plate is detected.
  </Step>
  <Step title="View the detected plate in the history list">
    When the app confirms a detection, it adds the plate to the history list on the right (or below the camera on mobile). Each entry shows the plate text, a confidence score, and the time it was detected. The camera stops scanning automatically after confirmation.

    <Note>
      The camera auto-stops after **3 seconds** of continuous detection. If the detection has a high mean confidence (0.8 or above), it stops after just **1 second**. This prevents duplicate captures. You can change this timing — or turn on continuous mode — in [Detection Settings](/detection-settings).
    </Note>

  </Step>
  <Step title="Inspect, edit, and copy the result">
    Tap or click any plate in the history list to open the detail view. Here you can:

    - See a cropped image of the detected plate
    - Review the confidence score for each individual character, shown as color-coded bars
    - Click **Edit** to correct any misread character
    - Click **Copy** to copy the plate text to your clipboard

  </Step>
</Steps>

## Try without a camera

You don't need a vehicle nearby to explore the app. ALPR Vue includes a built-in sample gallery with **10 real car photos** and **3 traffic video clips**. Click **Upload File** on the main screen, then open the sample gallery to pick any sample. The app processes it through the same AI pipeline and adds the detected plates to your history list, just as it would with a live camera.

This is a great way to get a feel for the results, confidence scores, and the detail view before you try it with your own images.
