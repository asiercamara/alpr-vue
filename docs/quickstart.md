---
title: 'Get Started with ALPR Vue'
description: 'Detect your first license plate in minutes — open the app, grant camera access, point at a vehicle, and view the result with a confidence score.'
---

This guide walks you through detecting your first license plate with ALPR Vue. By the end, you'll have the camera running, a plate captured in the history list, and know how to inspect and copy the result.

## Quick flow overview

This diagram shows the two main ways to try ALPR Vue for the first time: live camera or sample media.

<script setup>
const quickstartFlow = `
flowchart TD
  A[Open ALPR Vue in a supported browser] --> B{How do you want to try it?}
  B -->|Live camera| C[Click Start Camera]
  B -->|No camera nearby| D[Click Upload File and open the sample gallery]

  C --> E{Camera permission granted?}
  E -->|No| F[Allow camera access in browser settings and reload]
  F --> C
  E -->|Yes| G[Point at a visible license plate]

  G --> H{Plate clearly visible?}
  H -->|No| I[Move closer, improve lighting, or hold the camera steadier]
  I --> G
  H -->|Yes| J[ALPR Vue detects and confirms the plate]

  D --> K[Choose a sample image or video]
  K --> L[ALPR Vue processes the sample media]

  J --> M[Result is added to history]
  L --> M
  M --> N[Open the detail view]
  N --> O[Review, edit, or copy the result]
`
</script>

<VTDocDiagramPresenter :code="quickstartFlow" autoPlay="intersect" :highlight="['M', 'O']" />

## Detect a plate with the live camera

<VTDocSteps>
  <VTDocStep title="Open the app in a supported browser">
    <p>
      Open ALPR Vue in a modern browser such as Chrome, Edge, Firefox, or Safari 16+. For the camera to work, the page must
      be served over <strong>HTTPS or localhost</strong> — this is a browser security requirement, not something specific to
      ALPR Vue. If you're accessing a self-hosted instance, make sure it uses a secure connection.
    </p>
    <p>
      Not sure your browser is supported? See
      <a href="./browser-requirements">Supported Browsers and Device Requirements</a>.
    </p>
  </VTDocStep>
  <VTDocStep title="Grant camera permissions">
    <p>
      Click <strong>Start Camera</strong>. Your browser will ask whether ALPR Vue can access your camera. Click
      <strong>Allow</strong>.
    </p>
    <VTDocTip>
      If you accidentally clicked <strong>Block</strong>, or if the permission prompt never appeared, you can reset it in
      your browser settings. In Chrome, click the lock icon in the address bar and set <strong>Camera</strong> to
      <strong>Allow</strong>. In Safari, go to <strong>Settings → Websites → Camera</strong> and allow access for the site.
      Then reload the page.
    </VTDocTip>
  </VTDocStep>
  <VTDocStep title="Point the camera at a vehicle">
    <p>
      Once the camera is active, hold your phone or position your webcam so the license plate is clearly visible. The app scans
      automatically — you don't need to press anything. A bounding box appears on screen when a plate is detected.
    </p>
  </VTDocStep>
  <VTDocStep title="View the detected plate in the history list">
    <p>
      When the app confirms a detection, it adds the plate to the history list on the right (or below the camera on mobile).
      Each entry shows the plate text, a confidence score, and the time it was detected. The camera stops scanning automatically
      after confirmation.
    </p>
    <VTDocNote>
      The camera auto-stops after <strong>3 seconds</strong> of continuous detection. If the detection has a high mean
      confidence (0.8 or above), it stops after just <strong>1 second</strong>. This prevents duplicate captures. You can
      change this timing — or turn on continuous mode — in <a href="./detection-settings">Detection Settings</a>.
    </VTDocNote>
  </VTDocStep>
  <VTDocStep title="Inspect, edit, and copy the result">
    <p>Tap or click any plate in the history list to open the detail view. Here you can:</p>
    <ul>
      <li>See a cropped image of the detected plate</li>
      <li>Review the confidence score for each individual character, shown as color-coded bars</li>
      <li>Click <strong>Edit</strong> to correct any misread character</li>
      <li>Click <strong>Copy</strong> to copy the plate text to your clipboard</li>
    </ul>
  </VTDocStep>
</VTDocSteps>

## Try without a camera

You don't need a vehicle nearby to explore the app. ALPR Vue includes a built-in sample gallery with **10 real car photos** and **3 traffic video clips**. Click **Upload File** on the main screen, then open the sample gallery to pick any sample. The app processes it through the same AI pipeline and adds the detected plates to your history list, just as it would with a live camera.

This is a great way to get a feel for the results, confidence scores, and the detail view before you try it with your own images.
