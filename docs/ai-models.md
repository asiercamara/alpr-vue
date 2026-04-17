---
title: 'AI Models Used for License Plate Recognition'
description: 'Learn about the YOLOv9 plate detector and MobileViT v2 OCR model that power ALPR Vue — both run locally in your browser with no cloud API required.'
---

ALPR Vue relies on two ONNX models that run locally in your browser — no cloud API, no remote inference. The first model detects where license plates are in the image; the second reads the characters on each plate. Both models load directly in your browser tab using ONNX Runtime Web.

<Tabs>
  <Tab title="Plate detector">
    The plate detector scans each frame and draws bounding boxes around any license plates it finds.

    | Property | Value |
    |---|---|
    | Model file | `yolo-v9-t-384-license-plates-end2end.onnx` |
    | Architecture | YOLOv9 (single-pass object detection) |
    | Input resolution | 384 × 384 pixels |
    | Source | [open-image-models](https://github.com/ankandrew/open-image-models) |

    **How it works:** The model resizes each frame to 384 × 384 pixels, then analyzes the entire image in a single forward pass through the neural network. It divides the image into a grid and predicts bounding boxes and confidence scores for each cell. The result is a set of bounding boxes — one for each plate region the model found.

    The model is a compact YOLOv9-t variant, designed to run efficiently on resource-limited devices like phones and laptops. It has been specifically trained on European plates under a variety of lighting conditions and camera angles.

  </Tab>
  <Tab title="Plate OCR">
    The plate OCR model reads the characters from each detected plate region and assigns a confidence score to each character.

    | Property | Value |
    |---|---|
    | Model file | `european_mobile_vit_v2_ocr.onnx` |
    | Architecture | MobileViT v2 (CNN with multiple output heads) |
    | Input resolution | 140 × 70 pixels |
    | Alphabet | A–Z, 0–9, hyphen, underscore (used as padding) |
    | Maximum plate length | 9 characters |
    | Source | [open-image-models](https://github.com/ankandrew/open-image-models) |

    **How it works:** The cropped plate region is resized to 140 × 70 pixels and converted to grayscale. The model then processes this image through a series of convolutional layers. It has 9 output heads — one for each possible character position on the plate. Each head produces a probability distribution across the full alphabet, and the character with the highest probability is selected for that position. Padding characters are stripped from the final result, leaving only the actual plate text.

    Because each character has its own output head, the model reports an individual confidence score per character. You can view these scores in the plate detail view by tapping any entry in your history.

  </Tab>
</Tabs>

## Model format

Both models are stored in **ONNX** (Open Neural Network Exchange) format. ONNX is an open standard for representing machine learning models, which makes it possible to run models trained in Python directly in the browser.

ALPR Vue uses **ONNX Runtime Web** to run inference. This library compiles the models to WebAssembly, which runs natively in modern browsers without any plugins or extensions. The result is near-native inference speed entirely within your browser tab.

## Limitations

<Warning>
  The models are optimized for European license plates. Detection and OCR accuracy may be lower for plates from other regions, especially those that use different character sets, plate dimensions, or layouts.
</Warning>

- **Regional coverage:** Both models were trained primarily on European plates. Accuracy varies for plates from North America, Asia, and other regions.
- **Device performance:** Inference speed depends on your device's CPU. Older or low-power devices may experience slower frame rates.
- **Browser requirements:** ONNX Runtime Web requires WebAssembly support. All modern browsers support this, but very old browser versions may not.

<Note>
  The models are downloaded once on your first visit and cached by your browser. On subsequent visits, the app loads them from the local browser cache — no network request is needed, and the app works fully offline.
</Note>
