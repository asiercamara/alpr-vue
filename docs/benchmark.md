---
title: 'Benchmark: OCR, Detector and Runtime Choices'
description: 'How the OCR model, plate detector and ONNX runtime used by ALPR Vue were compared on 1,975 real photos with ground truth: methods, results, limitations and recommendations.'
---

This page documents the benchmark behind the model choices in ALPR Vue: which OCR (optical character recognition) model, which license plate detector, which detection threshold and which ONNX Runtime Web setup. It lists what was tested, how, the full results and what we recommend. Results date from 2026-10-11, comparing branch `feature/ocr-cct-v2` against `develop` (ef429b1).

<VTDocNote>

**Dataset attribution.** All measurements use the **UC3M-LP** dataset by Álvaro Ramajo-Ballester, José María Armingol Moreno and Arturo de la Escalera Hueso (Universidad Carlos III de Madrid), published under the [ODbL-1.0](https://opendatacommons.org/licenses/odbl/1-0/) license.

- Repository: https://github.com/ramajoballester/UC3M-LP
- Download: https://doi.org/10.21950/OS5W4Z (alternative: https://zenodo.org/records/17152029)
- Paper (open access): https://doi.org/10.1016/j.robot.2023.104608

The dataset is not redistributed here; the images were used only for evaluation. If you reuse these results, cite the paper (full reference in [Citation and attributions](#citation-and-attributions)).

</VTDocNote>

All tables are generated automatically from the raw benchmark results. The benchmark scripts are not part of this repository.

## Summary

- **OCR: CCT-XS v2 (global).** It reads **70.9%** of the 2,547 plates in the dataset without error, against **65.2%** for the previous OCR (European MobileViT v2), at the same speed (154 ms against 149 ms per image) and with the same detector. The difference is significant (McNemar, p<0.001). CCT-S v2 is 54% slower (237 ms) and less accurate (68.4%), so it does not pay off.
- **The previous OCR does not load with onnxruntime-web 1.30** (shape inference error), so the runtime upgrade and the OCR change go together. With the same model, 1.24.3 and 1.30.0 give the same speed and the same results.
- **The biggest lever is the detector, not the OCR.** The previous detector setup (YOLOv9-t at 384 px, threshold 0.6) finds only 83.7% of the plates. Lowering the threshold to 0.25 raises the final result to 74.8% at no time cost. Raising the resolution to 640 px gives 74.4% (393 ms). Both together give **78.4%**.
- **Multithreaded WebAssembly** (4 threads) cuts the time by about 2.7× (154 → 56 ms) without changing any result, at the price of about twice the total CPU time and of serving the app with COOP/COEP headers.
- **On real phones** (Oppo Find X9 Pro and OnePlus 6, 50 dataset photos) multithreading is what makes the larger detector viable: YOLOv9-t 640 with 4 threads finds 95.8% of the plates (88.9% for the current app) and takes 278 ms on the Oppo (250 ms the current app) and 2,049 ms on the OnePlus 6 (2,884 ms the current app). The 2018 OnePlus 6 processes only 0.34 photos per second with the current app, a key fact for a camera or video mode ([details](#measurement-on-real-phones)).
- **Best measured accuracy/time trade-off:** YOLOv9-t 640 + threshold 0.25 + 4 threads + CCT-XS v2 reaches **78.4% at 134 ms per image** (against 70.9% at 154 ms). With YOLOv9-s 608 instead of t-640: **81.6% at 287 ms**.
- **Discarded:** letterbox in the detector (loses 6 points), YOLOv9-t 256 (58.2%) and CCT-S v1 (61.3%, the worst and slowest OCR).

### Recommendation

| Scenario                               | Configuration                                         | Result | ms/image |
| -------------------------------------- | ----------------------------------------------------- | -----: | -------: |
| Smallest change, no special headers    | CCT-XS v2 + threshold 0.25 (current detector)         |  74.8% |      156 |
| Recommended if COOP/COEP can be served | CCT-XS v2 + YOLOv9-t 640 + threshold 0.25 + 4 threads |  78.4% |      134 |
| Maximum accuracy                       | CCT-XS v2 + YOLOv9-s 608 + threshold 0.25 + 4 threads |  81.6% |      287 |

**Already applied in branch `feature/ocr-cct-v2`** (commit `5d3e272`): CCT-XS v2, detector threshold 0.25 and an O/Q/I correction for Spanish plates, with the previous OCR removed (see [Recommendations and status](#recommendations-and-status)). The larger detector and multithreading are still to be decided.

## What was tested

### Starting point and models

- **Starting app** (`develop`, ef429b1): YOLOv9-t detector at 384 px (threshold 0.6), European MobileViT v2 OCR, onnxruntime-web 1.24.3, single-thread WebAssembly inference, image stretched to a square for the detector.
- **Model sources:** detector and OCR from [open-image-models](https://github.com/ankandrew/open-image-models) and [fast-plate-ocr](https://github.com/ankandrew/fast-plate-ocr) (ankandrew, MIT), the same projects the app uses.
- **CCT OCR** (Compact Convolutional Transformer): sizes XS and S, versions v1 and v2. The v2 models add a head that predicts the plate's country. Input 128×64 RGB, 36-character alphabet plus padding, 10 positions.
- **YOLOv9 detectors** exported with built-in NMS ("end2end"): t-256, t-384 (the current one), t-416, t-512, t-640 and s-608.

### Variants measured

24 variants in two phases, each one the real app built with the listed changes. All use the t-384 detector and CCT-XS v2 unless stated.

| Variant                                                                                                                                  | What changes                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Reference (t-384)**                                                                                                                    | CCT-XS v2, ORT 1.30.0, t-384 detector, threshold 0.6                           |
| Reference (repeat midway), Reference (repeat at the end)                                                                                 | Reference repeated midway and at the end of phase 1 (session drift)            |
| Previous OCR (MobileViT v2)                                                                                                              | Previous European MobileViT v2 OCR with ORT 1.24.3 (production reference only) |
| CCT-XS v1, CCT-S v1, CCT-S v2                                                                                                            | Other CCT OCR models                                                           |
| Reference with ORT 1.24.3                                                                                                                | CCT-XS v2 with onnxruntime-web 1.24.3 (runtime effect)                         |
| 2 threads, 4 threads, 8 threads                                                                                                          | Multithreaded WebAssembly with 2, 4 (automatic) and 8 threads                  |
| t-256, t-416, t-512, t-640                                                                                                               | YOLOv9-t detector at other resolutions                                         |
| s-608                                                                                                                                    | YOLOv9-s detector at 608 px                                                    |
| Letterbox (t-384)                                                                                                                        | Letterbox instead of stretching the image                                      |
| Threshold 0.25                                                                                                                           | Detector confidence threshold 0.25 instead of 0.6                              |
| Threshold 0.25 + t-640                                                                                                                   | Threshold 0.25 with the t-640 detector                                         |
| 4 threads + t-640, 4 threads + threshold 0.25, 4 threads + threshold 0.25 + t-640, 4 threads + s-608, 4 threads + threshold 0.25 + s-608 | The same combinations with 4 threads                                           |

Skipped without measuring: the global MobileViT v2 OCR (it does not load with ORT 1.30) and letterbox with larger detectors (letterbox + t-512, + t-640 and + s-608), because letterbox already lost 6 points with the current detector (see [Detector](#detector)).

## What was measured and how

### Dataset

UC3M-LP (Ramajo-Ballester et al., _Robotics and Autonomous Systems_ 172, 2024; ODbL-1.0 license): real photos of cars with Spanish license plates, with polygon and character annotations. Both splits (train and test) are used, because volume was needed and, as far as we know, the evaluated models were not trained on this dataset (not verified, see [Limitations](#limitations)).

| Item                            | Value                                                                                                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Images                          | 1975                                                                                                                                           |
| Plates                          | 2547                                                                                                                                           |
| Resolutions                     | 5184×3888 (822), 6960×4640 (820), 9248×6944 (162), 2048×1536 (77), 2016×4480 (46), 4480×2016 (36), 6944×9248 (6), 1536×2048 (5), 4624×3472 (1) |
| Plate type                      | A: 2498, D: 11, B: 31, E: 6, C: 1                                                                                                              |
| Lighting                        | night: 362, day: 2185                                                                                                                          |
| Plate width at the 384 px input | p10 15 px · median 34 px · p90 73 px                                                                                                           |

Details that shape the interpretation:

- Every plate has **2 characters hidden by a grey box** (shown as `*` in the annotation). The ground truth is partial: any character is accepted in those positions and not reading them is not penalised.
- Those grey boxes sometimes make models **repeat the neighbouring letter** (`614BMM` instead of `614BM`). This is a dataset artifact, not a real model failure (see [Grey box artifact](#grey-box-artifact)).
- Most photos were taken in daylight (2,185 plates against 362 at night) and are very large (up to 9248×6944), so at the detector's 384 px input the median plate is only 34 px wide. This is a hard test for the detector.
- Only the main plates are annotated. Some of the "detections without an annotated plate" are real background plates.

### Metrics

- **Found:** real plates with a detection of IoU ≥ 0.5 (IoU ≥ 0.3 is also given in [Detector](#detector)).
- **Read OK (of those found):** OCR quality, a reading with no edit errors against the template (with wildcards).
- **Read OK (of all):** the end-to-end metric and the main one of this page; it combines detector and OCR. 95% Wilson confidence intervals.
- **Exact McNemar test** against the new reference (Reference (t-384)), on the same plates.
- **ms/image:** time from `postMessage` to the answer of the app's real Web Worker, median over the 1,975 images (image decoding is measured separately and excluded).

### Test bench

- The real app built per variant (`git archive` plus patches), served locally and run in Chromium (Playwright). The app's real `Worker` is what gets timed.
- **Models loaded once** per variant, 5 warm-up images discarded and one full pass over 1,975 images. A fresh Chromium per variant.
- **One variant at a time**, waiting for a free CPU (≥97%) before starting and without using the machine during the run.
- No crops are saved: the correct answer is already in the dataset.
- The reference was repeated at the start, midway and at the end of the session to measure drift (see [Session drift](#session-drift)).

| Item              | Value                                                     |
| ----------------- | --------------------------------------------------------- |
| CPU               | AMD Ryzen 9 5900X 12-Core Processor (24 threads)          |
| RAM               | 63 GB                                                     |
| System            | CachyOS, Linux 7.2.9-2-cachyos                            |
| CPU governor      | powersave (amd-pstate-epp, preference power)              |
| Node / Playwright | v22.22.2 / 1.63.0                                         |
| Browser           | 153.0.8010.12 (Chromium, new headless)                    |
| App code          | feature/ocr-cct-v2 @ e993f87; reference develop @ ef429b1 |
| onnxruntime-web   | 1.30.0 and 1.24.3                                         |

## Overall results

| Variant                            | What it is                                                 | ms/image (median) |     p95 | Found | Read OK (of those found) |    Read OK (of all) | Δ vs. ref. | p (McNemar) |
| ---------------------------------- | ---------------------------------------------------------- | ----------------: | ------: | ----: | -----------------------: | ------------------: | ---------: | ----------: |
| 4 threads + threshold 0.25 + s-608 | 4 threads + threshold 0.25 + s-608                         |            287 ms |  300 ms | 96.9% |                    84.2% | 81.6% (80.0%–83.0%) |   +10.7 pp |      <0.001 |
| Threshold 0.25 + t-640             | threshold 0.25 + t-640                                     |            392 ms |  421 ms | 94.5% |                    83.0% | 78.4% (76.8%–80.0%) |    +7.6 pp |      <0.001 |
| 4 threads + threshold 0.25 + t-640 | 4 threads + threshold 0.25 + t-640                         |            134 ms |  145 ms | 94.5% |                    83.0% | 78.4% (76.8%–80.0%) |    +7.6 pp |      <0.001 |
| s-608                              | YOLOv9-s 608 detector                                      |           1039 ms | 1061 ms | 92.2% |                    84.9% | 78.3% (76.7%–79.9%) |    +7.5 pp |      <0.001 |
| 4 threads + s-608                  | 4 threads + s-608                                          |            289 ms |  300 ms | 92.2% |                    84.9% | 78.3% (76.7%–79.9%) |    +7.5 pp |      <0.001 |
| Threshold 0.25                     | detector threshold 0.25 (instead of 0.6)                   |            156 ms |  176 ms | 89.0% |                    84.0% | 74.8% (73.1%–76.5%) |    +4.0 pp |      <0.001 |
| 4 threads + threshold 0.25         | 4 threads + threshold 0.25                                 |             56 ms |   66 ms | 89.0% |                    84.0% | 74.8% (73.1%–76.5%) |    +4.0 pp |      <0.001 |
| t-640                              | YOLOv9-t detector 640                                      |            393 ms |  416 ms | 88.7% |                    83.9% | 74.4% (72.6%–76.0%) |    +3.5 pp |      <0.001 |
| 4 threads + t-640                  | 4 threads + t-640                                          |            132 ms |  143 ms | 88.7% |                    83.9% | 74.4% (72.6%–76.0%) |    +3.5 pp |      <0.001 |
| t-416                              | YOLOv9-t detector 416                                      |            182 ms |  201 ms | 84.4% |                    84.2% | 71.0% (69.2%–72.8%) |    +0.2 pp |       0.881 |
| 2 threads                          | multithreaded WebAssembly, 2 threads                       |             88 ms |  101 ms | 83.7% |                    84.7% | 70.9% (69.1%–72.6%) |    +0.0 pp |       1.000 |
| 4 threads                          | multithreaded WebAssembly, 4 threads (automatic)           |             56 ms |   65 ms | 83.7% |                    84.7% | 70.9% (69.1%–72.6%) |    +0.0 pp |       1.000 |
| 8 threads                          | multithreaded WebAssembly, 8 threads                       |             47 ms |   57 ms | 83.7% |                    84.7% | 70.9% (69.1%–72.6%) |    +0.0 pp |       1.000 |
| Reference (repeat midway)          | reference repeat (session drift)                           |            153 ms |  171 ms | 83.7% |                    84.7% | 70.9% (69.1%–72.6%) |    +0.0 pp |       1.000 |
| Reference (repeat at the end)      | reference repeat at the end (session drift)                |            154 ms |  171 ms | 83.7% |                    84.7% | 70.9% (69.1%–72.6%) |    +0.0 pp |       1.000 |
| Reference with ORT 1.24.3          | CCT-XS v2 with ORT 1.24.3                                  |            152 ms |  170 ms | 83.7% |                    84.7% | 70.9% (69.1%–72.6%) |    +0.0 pp |       1.000 |
| **Reference (t-384)**              | CCT-XS v2 global (+ region) — new reference                |            154 ms |  172 ms | 83.7% |                    84.7% | 70.9% (69.1%–72.6%) |          — |           — |
| t-512                              | YOLOv9-t detector 512                                      |            266 ms |  285 ms | 82.3% |                    84.2% | 69.3% (67.5%–71.1%) |    -1.6 pp |       0.062 |
| CCT-S v2                           | CCT-S v2 global (+ region)                                 |            237 ms |  337 ms | 83.7% |                    81.7% | 68.4% (66.6%–70.2%) |    -2.5 pp |       0.003 |
| CCT-XS v1                          | CCT-XS v1 global                                           |            152 ms |  168 ms | 83.7% |                    81.3% | 68.0% (66.2%–69.8%) |    -2.8 pp |      <0.001 |
| Previous OCR (MobileViT v2)        | European MobileViT v2 OCR (the one in develop), ORT 1.24.3 |            149 ms |  165 ms | 83.7% |                    77.9% | 65.2% (63.3%–67.0%) |    -5.7 pp |      <0.001 |
| Letterbox (t-384)                  | letterbox in the detector (t-384)                          |            153 ms |  169 ms | 77.7% |                    83.5% | 64.9% (63.0%–66.7%) |    -6.0 pp |      <0.001 |
| CCT-S v1                           | CCT-S v1 global                                            |            312 ms |  488 ms | 83.7% |                    73.3% | 61.3% (59.4%–63.2%) |    -9.5 pp |      <0.001 |
| t-256                              | YOLOv9-t detector 256                                      |             79 ms |   95 ms | 69.7% |                    83.4% | 58.2% (56.3%–60.1%) |   -12.7 pp |      <0.001 |

Why several rows have identical accuracy: the "2 threads", "4 threads", "8 threads" and "Reference with ORT 1.24.3" rows change only speed or runtime and produce **exactly the same readings** as the reference. They confirm that multithreading and the ORT version change do not alter the result.

![Scatter chart of median time per image against percentage of plates read without error, for every variant.](/benchmark/en/speed-vs-accuracy.svg)

_Speed against accuracy, per variant. Each number in the chart matches the variant in the list on the right; the repeats of the reference share its number._

## Detector

| Variant                            | Recall IoU ≥ 0.5 (95% CI) | Recall IoU ≥ 0.3 | Detections without an annotated plate | recall <16 px | recall 16–24 | recall 24–32 | recall 32–48 | recall ≥48 |
| ---------------------------------- | ------------------------: | ---------------: | ------------------------------------: | ------------: | -----------: | -----------: | -----------: | ---------: |
| 4 threads + threshold 0.25 + s-608 |       96.9% (96.2%–97.5%) |            97.4% |                                   265 |           82% |          97% |          99% |         100% |       100% |
| Threshold 0.25 + t-640             |       94.5% (93.5%–95.3%) |            95.6% |                                   220 |           78% |          96% |          97% |          98% |        95% |
| 4 threads + threshold 0.25 + t-640 |       94.5% (93.5%–95.3%) |            95.6% |                                   220 |           78% |          96% |          97% |          98% |        95% |
| s-608                              |       92.2% (91.1%–93.2%) |            92.5% |                                   105 |           50% |          95% |          98% |          99% |        99% |
| 4 threads + s-608                  |       92.2% (91.1%–93.2%) |            92.5% |                                   105 |           50% |          95% |          98% |          99% |        99% |
| Threshold 0.25                     |       89.0% (87.8%–90.2%) |            90.5% |                                   141 |           35% |          90% |          97% |          98% |        98% |
| 4 threads + threshold 0.25         |       89.0% (87.8%–90.2%) |            90.5% |                                   141 |           35% |          90% |          97% |          98% |        98% |
| t-640                              |       88.7% (87.4%–89.8%) |            89.3% |                                    83 |           47% |          93% |          96% |          96% |        92% |
| 4 threads + t-640                  |       88.7% (87.4%–89.8%) |            89.3% |                                    83 |           47% |          93% |          96% |          96% |        92% |
| t-416                              |       84.4% (82.9%–85.7%) |            85.7% |                                    92 |           25% |          85% |          95% |          96% |        90% |
| 2 threads                          |       83.7% (82.2%–85.1%) |            84.4% |                                    60 |           16% |          80% |          95% |          97% |        96% |
| 4 threads                          |       83.7% (82.2%–85.1%) |            84.4% |                                    60 |           16% |          80% |          95% |          97% |        96% |
| 8 threads                          |       83.7% (82.2%–85.1%) |            84.4% |                                    60 |           16% |          80% |          95% |          97% |        96% |
| Reference (repeat midway)          |       83.7% (82.2%–85.1%) |            84.4% |                                    60 |           16% |          80% |          95% |          97% |        96% |
| Reference (repeat at the end)      |       83.7% (82.2%–85.1%) |            84.4% |                                    60 |           16% |          80% |          95% |          97% |        96% |
| Reference (t-384)                  |       83.7% (82.2%–85.1%) |            84.4% |                                    60 |           16% |          80% |          95% |          97% |        96% |
| t-512                              |       82.3% (80.8%–83.8%) |            82.8% |                                    70 |           24% |          84% |          91% |          94% |        90% |
| Letterbox (t-384)                  |       77.7% (76.0%–79.3%) |            78.0% |                                    56 |            7% |          56% |          90% |          96% |        97% |
| t-256                              |       69.7% (67.9%–71.5%) |            70.7% |                                    30 |            2% |          36% |          78% |          93% |        92% |

![Chart of the share of plates found by plate width at the 384 px input, for several detectors.](/benchmark/en/recall-by-size.svg)

_Share of plates found by plate size._

Reading the results:

- The previous detector setup misses 16.3% of the plates, mostly the small ones: with a width under 16 px at the input it finds only 16%, and between 16 and 24 px it finds 80%.
- **Resolution:** a higher resolution finds more small plates (t-640: 47% of those under 16 px), but the effect is not monotonic. **t-512 (82.3%) is worse than t-384 (83.7%)**, and on large plates (≥48 px) t-416, t-512 and t-640 do worse than t-384 (90–92% against 96%). Each YOLO model exported at another size behaves differently, so the size has to be chosen by measuring, not by interpolation.
- **Threshold 0.25:** it is free in time. It raises recall on every detector (+5.3 pp with t-384, +5.8 pp with t-640, +4.7 pp with s-608) at the cost of more detections without an annotated plate (141 instead of 60 with t-384). The app's quality and confidence filters should discard some of them; how many was not measured.
- **YOLOv9-s 608** is the best detector measured (92.2% at threshold 0.6; 96.9% at 0.25), but its model is 36.4 MB against 7.8 MB and it costs 1,039 ms per image on a single thread (289 ms with 4 threads).
- **Letterbox** (keeping the aspect ratio instead of stretching the image to a square) is much worse (77.7%): the photos are 4:3 and letterbox shrinks the plate by 25%. The app stretches the image and the model works well that way.

### Detector threshold sweep

The sweeps are computed by filtering the detections of the run made with threshold 0.25.

| Detector threshold (t-384) | Recall IoU ≥ 0.5 | Detections without an annotated plate | Read OK (of all) |
| -------------------------- | ---------------: | ------------------------------------: | ---------------: |
| 0.25                       |            89.0% |                                   141 |            74.8% |
| 0.3                        |            88.5% |                                   119 |            74.4% |
| 0.4                        |            87.5% |                                    94 |            73.6% |
| 0.5                        |            85.9% |                                    77 |            72.4% |
| 0.6                        |            83.7% |                                    60 |            70.9% |
| 0.7                        |            79.7% |                                    37 |            67.7% |

| Detector threshold (t-640) | Recall IoU ≥ 0.5 | Detections without an annotated plate | Read OK (of all) |
| -------------------------- | ---------------: | ------------------------------------: | ---------------: |
| 0.25                       |            94.5% |                                   220 |            78.4% |
| 0.3                        |            93.7% |                                   192 |            77.8% |
| 0.4                        |            92.5% |                                   144 |            76.9% |
| 0.5                        |            90.8% |                                   109 |            75.8% |
| 0.6                        |            88.7% |                                    83 |            74.4% |
| 0.7                        |            84.1% |                                    53 |            71.1% |

| Detector threshold (4 hilos + s-608) | Recall IoU ≥ 0.5 | Detections without an annotated plate | Read OK (of all) |
| ------------------------------------ | ---------------: | ------------------------------------: | ---------------: |
| 0.25                                 |            96.9% |                                   265 |            81.6% |
| 0.3                                  |            96.5% |                                   233 |            81.2% |
| 0.4                                  |            95.5% |                                   180 |            80.7% |
| 0.5                                  |            94.4% |                                   138 |            79.9% |
| 0.6                                  |            92.2% |                                   105 |            78.3% |
| 0.7                                  |            89.0% |                                    74 |            76.2% |

The old threshold (0.6) is very conservative: lowering it to 0.25 keeps improving the final result. The cost is more detections without an annotated plate (from 60 to 141 with t-384).

## OCR

| OCR                         | Read OK (of those found, 95% CI) | Errors per visible character | Mean confidence | ms/img |
| --------------------------- | -------------------------------: | ---------------------------: | --------------: | -----: |
| Reference with ORT 1.24.3   |              84.7% (83.1%–86.1%) |                        0.035 |           95.6% | 152 ms |
| CCT-XS v2 (reference)       |              84.7% (83.1%–86.1%) |                        0.035 |           95.6% | 154 ms |
| CCT-S v2                    |              81.7% (80.0%–83.3%) |                        0.042 |           94.4% | 237 ms |
| CCT-XS v1                   |              81.3% (79.6%–82.9%) |                        0.042 |           93.8% | 152 ms |
| Previous OCR (MobileViT v2) |              77.9% (76.0%–79.6%) |                        0.057 |           71.1% | 149 ms |
| CCT-S v1                    |              73.3% (71.3%–75.1%) |                        0.063 |           91.6% | 312 ms |

- **CCT-XS v2** is the best and matches the speed of the previous OCR. **CCT-S v2** does not improve (81.7% against 84.7% of those found) and is 54% slower. The v1 version of both is worse than v2.
- **Errors per visible character:** 0.035 (XS v2) against 0.057 (previous), 39% fewer.
- **Confidence:** the previous OCR's confidence is low and barely discriminating (mean 71%, nothing above 0.9). The CCT models are much better calibrated: when CCT-XS v2 reports more than 0.9, it is right 89% of the time.

| OCR                         | conf 0–0.5 (n · accuracy) | conf 0.5–0.7 (n · accuracy) | conf 0.7–0.9 (n · accuracy) | conf 0.9–1 (n · accuracy) |
| --------------------------- | ------------------------: | --------------------------: | --------------------------: | ------------------------: |
| Previous OCR (MobileViT v2) |                  90 · 16% |                   725 · 65% |                  1317 · 89% |                     0 · – |
| CCT-XS v1                   |                   9 · 11% |                    26 · 15% |                   464 · 67% |                1633 · 87% |
| CCT-S v1                    |                    5 · 0% |                    30 · 10% |                   779 · 53% |                1318 · 87% |
| CCT-S v2                    |                   11 · 9% |                    38 · 18% |                   386 · 63% |                1697 · 88% |
| CCT-XS v2 (reference)       |                   8 · 13% |                    15 · 40% |                   326 · 67% |                1783 · 89% |

### Effect on the plate history

A simulation of the app's filters (mean confidence ≥ confidence threshold and quality score ≥ 0.7): which plates would reach the plate history and how many would be correct.

| Variant                     | Confidence threshold | Reach the history | History precision | Correct plates in the history (of all) |
| --------------------------- | -------------------: | ----------------: | ----------------: | -------------------------------------: |
| Previous OCR (MobileViT v2) |                  0.5 |              1342 |             88.7% |                                  46.7% |
| Previous OCR (MobileViT v2) |                  0.7 |              1327 |             88.6% |                                  46.2% |
| Previous OCR (MobileViT v2) |                  0.9 |                 0 |              0.0% |                                   0.0% |
| CCT-XS v1                   |                  0.5 |              2103 |             82.1% |                                  67.8% |
| CCT-XS v1                   |                  0.7 |              2102 |             82.1% |                                  67.7% |
| CCT-XS v1                   |                  0.9 |              1637 |             86.6% |                                  55.6% |
| CCT-S v2                    |                  0.5 |              2089 |             83.0% |                                  68.0% |
| CCT-S v2                    |                  0.7 |              2089 |             83.0% |                                  68.0% |
| CCT-S v2                    |                  0.9 |              1702 |             87.5% |                                  58.5% |
| CCT-XS v2 (reference)       |                  0.5 |              2108 |             84.9% |                                  70.3% |
| CCT-XS v2 (reference)       |                  0.7 |              2108 |             84.9% |                                  70.3% |
| CCT-XS v2 (reference)       |                  0.9 |              1788 |             88.4% |                                  62.0% |

With the previous OCR and the app's current thresholds only **46.7%** of all plates reach the history correctly read; with CCT-XS v2 it is **70.3%**. Part of that gain comes from the new model's confidence being higher and more informative. If the previous OCR were kept, the thresholds would need recalibrating.

### Breakdown

| Group                          | Plates | Found | Previous OCR (MobileViT v2): read OK of all | CCT-XS v2 (reference): read OK of all |
| ------------------------------ | -----: | ----: | ------------------------------------------: | ------------------------------------: |
| Day                            |   2185 |   85% |                                         66% |                                   72% |
| Night                          |    362 |   79% |                                         62% |                                   67% |
| Type A (standard)              |   2498 |   84% |                                         66% |                                   71% |
| Type B (double-row motorcycle) |     31 |   74% |                                         19% |                                   61% |
| Type C (light motorcycle)      |      1 |  100% |                                          0% |                                    0% |
| Type D (taxi/private hire)     |     11 |  100% |                                         18% |                                   55% |
| Type E (trailer)               |      6 |    0% |                                          0% |                                    0% |

Types C and E have 1 and 6 plates, so they are not conclusive. Double-row motorcycle plates (type B, 31 plates) go from 19% to 61%.

### Region head (v2 models only)

| Model                 | Predicts "Spain" | "Unknown" | Other regions (top 3)                   |
| --------------------- | ---------------: | --------: | --------------------------------------- |
| CCT-S v2              |            37.2% |      0.1% | Estonia 629, Austria 218, Belgium 117   |
| CCT-XS v2 (reference) |             4.7% |      0.0% | Estonia 1137, Portugal 315, Belgium 200 |

The CCT region head is **not reliable on Spanish plates** (CCT-XS v2 answers "Spain" 4.7% of the time and mostly "Estonia"). The app only passes it along and never shows it, so avoid using it in the interface.

## Errors and measurement quality

### Session drift

| Reference repeat              | Median ms/image | Difference from the first | Read OK (of all) |
| ----------------------------- | --------------: | ------------------------: | ---------------: |
| Reference (t-384)             |          154 ms |                         — |            70.9% |
| Reference (repeat midway)     |          153 ms |                     -0.7% |            70.9% |
| Reference (repeat at the end) |          154 ms |                      0.1% |            70.9% |

The reference repeated midway and at the end of phase 1 (about 3 h) varies by less than 1% in time and gives exactly the same accuracy, so measurements within the session are comparable.

### Reference errors

Edit operations of the reference (CCT-XS v2) on the plates found: substitutions 231, missing characters 138, extra characters 7.

| Confusion (true→read) | Times |
| --------------------- | ----: |
| 0→O                   |    40 |
| Y→I                   |     4 |
| W→S                   |     3 |
| N→W                   |     3 |
| 0→D                   |     3 |
| W→M                   |     3 |
| L→Z                   |     3 |
| V→N                   |     3 |
| H→P                   |     2 |
| N→I                   |     2 |
| B→8                   |     2 |
| V→I                   |     2 |
| W→H                   |     2 |
| M→F                   |     2 |

Of the 327 readings with at least one error from CCT-XS v2, 68 (21%) are fixed by removing a repeated letter (the dataset's grey box is read as a copy of its neighbour), so part of those failures are an artifact of the anonymisation.

Correcting O/Q→0 and I→1 offline (Spanish plates use no vowels or Q in the letters) raises the reference from 70.9% to 74.9% of plates read without error.

The dominant confusion is **0→O** (40 cases). Spanish plates have no vowels and no Q, so correcting it in the app (O/Q→0, I→1 in the read text) is a nearly free improvement (+4.0 pp in the earlier estimate).

### Grey box artifact

About one fifth of the CCT-XS v2 failures are fixed by removing a duplicated letter next to the grey box. On real photos without that masking, the accuracy should be somewhat higher than measured.

### Specific cases

Worst readings of the reference:

| Image       | True (· = hidden) | Reading of CCT-XS v2 | Confidence |
| ----------- | ----------------- | -------------------- | ---------: |
| train/00449 | `·007C·S`         | ``                   |         0% |
| train/00451 | `·007C·S`         | ``                   |         0% |
| train/01126 | `191·LR·`         | `C__497`             |        21% |
| train/00849 | `62·6·DF`         | `GR6310`             |        41% |
| train/00004 | `01·3·TD`         | `UA33T`              |        62% |
| train/00108 | `9·17·NB`         | `11IB`               |        72% |
| train/00158 | `99·0·GB`         | `99S88`              |        74% |
| train/00997 | `C5·48BS·`        | `G5468S`             |        69% |
| train/01863 | `906··WY`         | `806TR`              |        76% |
| train/00003 | `874··HP`         | `B874LPP`            |        70% |
| train/00156 | `19·7·NV`         | `19TN`               |        81% |
| train/00167 | `509·C·F`         | `509VK`              |        75% |
| train/00208 | `05·0·VN`         | `05OIN`              |        86% |
| train/00417 | `158··WZ`         | `158MM`              |        70% |
| train/01057 | `·033·XV`         | `033AN`              |        90% |

Cases where the previous OCR is right and the new one is not:

| Image       | True (· = hidden) | Previous OCR (MobileViT v2) | CCT-XS v2 (reference) |
| ----------- | ----------------- | --------------------------- | --------------------- |
| train/00010 | `6·14·BM`         | `614BM`                     | `614BMM`              |
| train/00019 | `88·0CC·`         | `880CC`                     | `88OCC`               |
| train/00026 | `24·0JV·`         | `240JV`                     | `24OJV`               |
| train/00028 | `1·15·GX`         | `115GX`                     | `115GXX`              |
| train/00067 | `0·35·XN`         | `035XN`                     | `O35XN`               |
| train/00090 | `0·21·HY`         | `021HHY`                    | `O21HY`               |
| train/00102 | `·769F·Y`         | `769FY`                     | `769FI`               |
| train/00107 | `M94·0W·`         | `M940W`                     | `M94OW`               |
| train/00109 | `·019F·Y`         | `019FY`                     | `019FI`               |
| train/00111 | `22·5G·N`         | `225GN`                     | `225GH`               |
| train/00118 | `0·56CZ·`         | `056CZ`                     | `O56CZ`               |
| train/00144 | `89·1·RZ`         | `891RRZ`                    | `891RR`               |

Large plates that the reference (t-384, threshold 0.6) does not find:

| Image       | True (· = hidden) | Width at the 384 input | Type/light |
| ----------- | ----------------- | ---------------------: | ---------- |
| test/01043  | `399·DV·`         |                 182 px | AD         |
| train/00969 | `93·0HZ·`         |                 168 px | AN         |
| train/00494 | `0·60·GR`         |                 166 px | BN         |
| train/01139 | `433··PY`         |                 126 px | AD         |
| train/01148 | `44·4LR·`         |                 126 px | AD         |
| train/01101 | `R22·2B·V`        |                 114 px | ED         |
| train/01966 | `16·5HX·`         |                 112 px | BD         |
| train/00106 | `00·1·DM`         |                 100 px | AD         |
| train/00796 | `785·H·B`         |                  90 px | AD         |
| train/00459 | `384·KV·`         |                  87 px | AN         |
| train/01935 | `·466CM·`         |                  84 px | AD         |
| train/01952 | `769··BH`         |                  83 px | AD         |

## Performance, memory and size

| Variant                            | Model loading | First image (cold) | Median ms/image |     p95 | Browser CPU ms/image | Peak memory (MB) | Image decoding (median) |
| ---------------------------------- | ------------: | -----------------: | --------------: | ------: | -------------------: | ---------------: | ----------------------: |
| 8 threads                          |       1163 ms |              84 ms |           47 ms |   57 ms |               988 ms |             2352 |                   62 ms |
| 4 threads + threshold 0.25         |       1074 ms |              92 ms |           56 ms |   66 ms |               487 ms |             2533 |                   61 ms |
| 4 threads                          |       1097 ms |              93 ms |           56 ms |   65 ms |               488 ms |             1828 |                   62 ms |
| t-256                              |       1084 ms |              99 ms |           79 ms |   95 ms |               177 ms |             2231 |                   61 ms |
| 2 threads                          |       1136 ms |             123 ms |           88 ms |  101 ms |               294 ms |             2049 |                   62 ms |
| 4 threads + t-640                  |       1165 ms |             178 ms |          132 ms |  143 ms |               745 ms |             1755 |                   61 ms |
| 4 threads + threshold 0.25 + t-640 |       1190 ms |             188 ms |          134 ms |  145 ms |               745 ms |             1582 |                   60 ms |
| Previous OCR (MobileViT v2)        |       1230 ms |             185 ms |          149 ms |  165 ms |               249 ms |             1802 |                   60 ms |
| Reference with ORT 1.24.3          |       1073 ms |             196 ms |          152 ms |  170 ms |               254 ms |             2034 |                   61 ms |
| CCT-XS v1                          |       1171 ms |             183 ms |          152 ms |  168 ms |               254 ms |             1768 |                   61 ms |
| Reference (repeat midway)          |       1168 ms |             174 ms |          153 ms |  171 ms |               253 ms |             1784 |                   60 ms |
| Letterbox (t-384)                  |       1157 ms |             174 ms |          153 ms |  169 ms |               253 ms |             2034 |                   61 ms |
| Reference (t-384)                  |       1236 ms |             182 ms |          154 ms |  172 ms |               254 ms |             1885 |                   61 ms |
| Reference (repeat at the end)      |       1175 ms |             175 ms |          154 ms |  171 ms |               255 ms |             2043 |                   60 ms |
| Threshold 0.25                     |       1166 ms |             180 ms |          156 ms |  176 ms |               258 ms |             2048 |                   60 ms |
| t-416                              |       1214 ms |             213 ms |          182 ms |  201 ms |               285 ms |             2060 |                   61 ms |
| CCT-S v2                           |       1200 ms |             256 ms |          237 ms |  337 ms |               349 ms |             1508 |                   60 ms |
| t-512                              |       1276 ms |             303 ms |          266 ms |  285 ms |               369 ms |             1533 |                   60 ms |
| 4 threads + threshold 0.25 + s-608 |       1339 ms |             351 ms |          287 ms |  300 ms |              1388 ms |             1600 |                   60 ms |
| 4 threads + s-608                  |       1368 ms |             342 ms |          289 ms |  300 ms |              1391 ms |             1848 |                   60 ms |
| CCT-S v1                           |       1202 ms |             351 ms |          312 ms |  488 ms |               436 ms |             1522 |                   61 ms |
| Threshold 0.25 + t-640             |       1355 ms |             433 ms |          392 ms |  421 ms |               505 ms |             2099 |                   61 ms |
| t-640                              |       1388 ms |             426 ms |          393 ms |  416 ms |               504 ms |             1587 |                   61 ms |
| s-608                              |       2008 ms |            1036 ms |         1039 ms | 1061 ms |              1154 ms |             1599 |                   61 ms |

- **Multithreading:** 4 threads give 56 ms (against 154), 8 threads 47 ms and 2 threads 88 ms. The cost is CPU time: about 488 ms of CPU per image with 4 threads against 254 ms with one. On a phone with fewer cores the gain will be smaller.
- **Memory:** the browser's peak RSS (1.5–2.5 GB) is dominated by decoding photos of up to 64 MP in this test, not by the models, and it is noisy between runs. It is not a reliable comparison between models.
- **Decoding the image** costs more than inference with 4 threads (60 ms median, 150 ms for 64 MP) and does not depend on the model. With real camera frames, or when resizing first, this part changes.
- **Model loading:** 1.1–1.4 s for the small detector, 2.0 s for s-608.
- **First image** (cold): about 30 ms more than the median.

| Resolution | Images | Inference t-384 (median) | Decoding (median) |
| ---------- | -----: | -----------------------: | ----------------: |
| 5184×3888  |    822 |                   154 ms |             53 ms |
| 6960×4640  |    820 |                   154 ms |             77 ms |
| 9248×6944  |    162 |                   156 ms |            150 ms |
| 2048×1536  |     77 |                   151 ms |             10 ms |
| 2016×4480  |     46 |                   152 ms |             24 ms |
| 4480×2016  |     36 |                   141 ms |             31 ms |
| 6944×9248  |      6 |                   153 ms |            148 ms |
| 1536×2048  |      5 |                   153 ms |             10 ms |
| 4624×3472  |      1 |                   136 ms |             45 ms |

| Variant                            | Detector (MB) | OCR (MB) | Total models (MB) |
| ---------------------------------- | ------------: | -------: | ----------------: |
| 4 threads + threshold 0.25 + s-608 |          36.4 |      8.3 |              44.7 |
| Threshold 0.25 + t-640             |          15.6 |      8.3 |              23.9 |
| 4 threads + threshold 0.25 + t-640 |          15.6 |      8.3 |              23.9 |
| s-608                              |          36.4 |      8.3 |              44.7 |
| 4 threads + s-608                  |          36.4 |      8.3 |              44.7 |
| Threshold 0.25                     |           7.8 |      8.3 |              16.1 |
| 4 threads + threshold 0.25         |           7.8 |      8.3 |              16.1 |
| t-640                              |          15.6 |      8.3 |              23.9 |
| 4 threads + t-640                  |          15.6 |      8.3 |              23.9 |
| t-416                              |          15.5 |      8.3 |              23.9 |
| 2 threads                          |           7.8 |      8.3 |              16.1 |
| 4 threads                          |           7.8 |      8.3 |              16.1 |
| 8 threads                          |           7.8 |      8.3 |              16.1 |
| Reference (repeat midway)          |           7.8 |      8.3 |              16.1 |
| Reference (repeat at the end)      |           7.8 |      8.3 |              16.1 |
| Reference with ORT 1.24.3          |           7.8 |      8.3 |              16.1 |
| Reference (t-384)                  |           7.8 |      8.3 |              16.1 |
| t-512                              |          15.6 |      8.3 |              23.9 |
| CCT-S v2                           |           7.8 |     10.2 |              18.0 |
| CCT-XS v1                          |           7.8 |      7.1 |              14.9 |
| Previous OCR (MobileViT v2)        |           7.8 |      5.0 |              12.8 |
| Letterbox (t-384)                  |           7.8 |      8.3 |              16.1 |
| CCT-S v1                           |           7.8 |     12.6 |              20.4 |
| t-256                              |          15.5 |      8.3 |              23.9 |

### Measurement on real phones

To check whether the desktop benchmark extrapolates, the same app pipeline (stretch to a square, YOLOv9, threshold 0.25, NMS, CCT-XS v2 and digit correction) was measured on two Android phones with a separate test web page. It uses a subset of **50 dataset photos** (72 plates, resized to 1,600 px on the long side) and 4 detector configurations, all with the same OCR. Models and images are loaded before measuring, so timings include neither loading nor decoding. The app's configuration is repeated at the end to measure drift. The page reproduces the app's boxes, texts and confidences exactly on the same 50 photos (0 differences), and it was also run on the reference PC (Firefox).

| Device                            | Browser              | System     | Cores reported | COOP/COEP isolation |
| --------------------------------- | -------------------- | ---------- | -------------- | ------------------- |
| Oppo Find X9 Pro (high end, 2025) | Chrome 155 (Android) | Android 16 | 5              | yes                 |
| OnePlus 6 (2018)                  | Chrome 155 (Android) | Android 11 | 7              | yes                 |
| Ryzen 9 5900X PC (reference)      | Firefox 157          | Linux      | 8              | yes                 |

| Device                            | Configuration                               | ms/image (median) | ms/image p95 | Images/s | Found | Read OK (of all) | × the PC |
| --------------------------------- | ------------------------------------------- | ----------------: | -----------: | -------: | ----: | ---------------: | -------: |
| Oppo Find X9 Pro (high end, 2025) | YOLOv9-t 384, 1 thread (the app today)      |               250 |          321 |     3.79 | 88.9% |            69.4% |      1.7 |
| Oppo Find X9 Pro (high end, 2025) | YOLOv9-t 640, 1 thread                      |               521 |          641 |     1.86 | 95.8% |            72.2% |      1.4 |
| Oppo Find X9 Pro (high end, 2025) | YOLOv9-t 640, 4 threads                     |               278 |          345 |     3.50 | 95.8% |            72.2% |        — |
| Oppo Find X9 Pro (high end, 2025) | YOLOv9-s 608, 4 threads                     |               579 |          772 |     1.69 | 94.4% |            75.0% |        — |
| Oppo Find X9 Pro (high end, 2025) | YOLOv9-t 384, 1 thread, repeated at the end |               242 |          313 |     4.07 | 88.9% |            69.4% |        — |
| OnePlus 6 (2018)                  | YOLOv9-t 384, 1 thread (the app today)      |              2884 |         3509 |     0.34 | 88.9% |            69.4% |     19.1 |
| OnePlus 6 (2018)                  | YOLOv9-t 640, 1 thread                      |              7038 |         7821 |     0.14 | 95.8% |            72.2% |     18.4 |
| OnePlus 6 (2018)                  | YOLOv9-t 640, 4 threads                     |              2049 |         2323 |     0.48 | 95.8% |            72.2% |        — |
| OnePlus 6 (2018)                  | YOLOv9-s 608, 4 threads                     |              5560 |         5855 |     0.18 | 94.4% |            75.0% |        — |
| OnePlus 6 (2018)                  | YOLOv9-t 384, 1 thread, repeated at the end |              2859 |         3484 |     0.34 | 88.9% |            69.4% |        — |
| Ryzen 9 5900X PC (reference)      | YOLOv9-t 384, 1 thread (the app today)      |               151 |          178 |     6.42 | 88.9% |            63.9% |        1 |
| Ryzen 9 5900X PC (reference)      | YOLOv9-t 640, 1 thread                      |               382 |          421 |     2.59 | 95.8% |            73.6% |        1 |

| Device                            | Configuration                               | Input preparation (median) | Detector (median) | OCR (median) |
| --------------------------------- | ------------------------------------------- | -------------------------: | ----------------: | -----------: |
| Oppo Find X9 Pro (high end, 2025) | YOLOv9-t 384, 1 thread (the app today)      |                         37 |               167 |           42 |
| Oppo Find X9 Pro (high end, 2025) | YOLOv9-t 640, 1 thread                      |                         56 |               422 |           35 |
| Oppo Find X9 Pro (high end, 2025) | YOLOv9-t 640, 4 threads                     |                         62 |               186 |           20 |
| Oppo Find X9 Pro (high end, 2025) | YOLOv9-s 608, 4 threads                     |                         47 |               504 |           20 |
| Oppo Find X9 Pro (high end, 2025) | YOLOv9-t 384, 1 thread, repeated at the end |                         37 |               156 |           38 |
| OnePlus 6 (2018)                  | YOLOv9-t 384, 1 thread (the app today)      |                        136 |              2435 |          309 |
| OnePlus 6 (2018)                  | YOLOv9-t 640, 1 thread                      |                        174 |              6527 |          300 |
| OnePlus 6 (2018)                  | YOLOv9-t 640, 4 threads                     |                        142 |              1766 |          110 |
| OnePlus 6 (2018)                  | YOLOv9-s 608, 4 threads                     |                        129 |              5291 |          113 |
| OnePlus 6 (2018)                  | YOLOv9-t 384, 1 thread, repeated at the end |                        138 |              2403 |          309 |
| Ryzen 9 5900X PC (reference)      | YOLOv9-t 384, 1 thread (the app today)      |                         12 |               124 |           14 |
| Ryzen 9 5900X PC (reference)      | YOLOv9-t 640, 1 thread                      |                         30 |               334 |           15 |

- **Accuracy does not depend on the device.** Both phones give the same results (69.4 / 72.2 / 72.2 / 75.0%) because the computation is deterministic. The PC gives 63.9% with the app's configuration against 69.4% on the phones with the same detection (88.9%); the most likely cause is that Firefox and Chrome rescale the image differently. With only 72 plates the difference is not significant (an interval of about ±10 points), so these figures are for comparing configurations with each other, not for estimating absolute accuracy: that is what the 2,547 plates of the large benchmark are for.
- **Time depends a lot on the device.** With the app's configuration (t-384, 1 thread) the Oppo takes 250 ms per photo (1.7 times the PC) and the OnePlus 6 takes **2,884 ms (19 times the PC)**: about 0.34 photos per second. The detector weighs the most on both, and on the OnePlus 6 the OCR as well (309 ms against 42 ms).
- **Threads pay off more than changing the model.** On the OnePlus 6, t-640 with 4 threads (2,049 ms) is **faster than the current app** (2,884 ms) and finds 95.8% of the plates against 88.9%. On the Oppo it costs a bit more (278 ms against 250 ms). With 1 thread, t-640 is 2 times slower on the Oppo and 2.4 times on the OnePlus 6.
- **s-608 does not pay off on phones.** It gains 2.8 reading points over t-640 (75.0% against 72.2%, 2 plates out of 72, within the noise) and takes 2.1 times (Oppo) and 2.7 times (OnePlus 6) longer with 4 threads.
- **No overheating in short passes.** On the OnePlus 6 the last quarter of each pass takes as long as the first (between −0.5% and +4.3%); on the Oppo the first quarter is the slowest (between −7% and −21%), which suggests the processor ramps up its frequency at the start. Passes last between 14 s (Oppo) and 6 min (OnePlus 6); the sustained test was not enabled, so heat during minutes of continuous use is still unmeasured.

| Device                            | Configuration                               | First quarter (ms) | Last quarter (ms) | Change |
| --------------------------------- | ------------------------------------------- | -----------------: | ----------------: | -----: |
| Oppo Find X9 Pro (high end, 2025) | YOLOv9-t 384, 1 thread (the app today)      |                298 |               253 | -15.0% |
| Oppo Find X9 Pro (high end, 2025) | YOLOv9-t 640, 1 thread                      |                564 |               527 |  -6.6% |
| Oppo Find X9 Pro (high end, 2025) | YOLOv9-t 640, 4 threads                     |                319 |               276 | -13.6% |
| Oppo Find X9 Pro (high end, 2025) | YOLOv9-s 608, 4 threads                     |                637 |               570 | -10.4% |
| Oppo Find X9 Pro (high end, 2025) | YOLOv9-t 384, 1 thread, repeated at the end |                274 |               216 | -21.0% |
| OnePlus 6 (2018)                  | YOLOv9-t 384, 1 thread (the app today)      |               2890 |              3013 |  +4.3% |
| OnePlus 6 (2018)                  | YOLOv9-t 640, 1 thread                      |               7071 |              7141 |  +1.0% |
| OnePlus 6 (2018)                  | YOLOv9-t 640, 4 threads                     |               2099 |              2089 |  -0.5% |
| OnePlus 6 (2018)                  | YOLOv9-s 608, 4 threads                     |               5593 |              5580 |  -0.2% |
| OnePlus 6 (2018)                  | YOLOv9-t 384, 1 thread, repeated at the end |               2865 |              2977 |  +3.9% |
| Ryzen 9 5900X PC (reference)      | YOLOv9-t 384, 1 thread (the app today)      |                152 |               156 |  +2.7% |
| Ryzen 9 5900X PC (reference)      | YOLOv9-t 640, 1 thread                      |                382 |               386 |  +0.9% |

**Measurement notes.** A first run on the OnePlus 6 was made while Google Play was updating apps in the background, and it was repeated. With 1 thread nothing changed (2,761 against 2,884 ms), but with 4 threads it did: t-640 went from 2,834 to 2,049 ms and s-608 from 7,264 to 5,560 ms. The numbers in the table are from the second run. Before measuring on a phone, close all other processes, because multithreading is sensitive to background load. All three devices had COOP/COEP isolation (through a service worker on the test page, since the hosting did not allow headers) and the requested threads were the effective ones.

**What this means for a camera or video mode.** With t-384 and one thread, the OnePlus 6 processes one image every 3 s and the Oppo about 4 per second. For video, only the latest available frame should be processed and the rest dropped, and on low-end devices the detector would have to be smaller (t-256 and t-416 were measured in the large benchmark, but not on phones). Raising accuracy with a larger detector only makes sense if it does not lower the frames per second; multithreading is what makes t-640 possible without losing speed.

## Environment

| Variant                            | Browser       | COOP/COEP isolation | Free CPU before | Governor  |
| ---------------------------------- | ------------- | ------------------- | --------------: | --------- |
| 4 threads + threshold 0.25 + s-608 | 153.0.8010.12 | yes                 |           99.6% | powersave |
| Threshold 0.25 + t-640             | 153.0.8010.12 | no                  |           97.6% | powersave |
| 4 threads + threshold 0.25 + t-640 | 153.0.8010.12 | yes                 |           99.7% | powersave |
| s-608                              | 153.0.8010.12 | no                  |           99.3% | powersave |
| 4 threads + s-608                  | 153.0.8010.12 | yes                 |           99.6% | powersave |
| Threshold 0.25                     | 153.0.8010.12 | no                  |           97.5% | powersave |
| 4 threads + threshold 0.25         | 153.0.8010.12 | yes                 |           99.6% | powersave |
| t-640                              | 153.0.8010.12 | no                  |           99.4% | powersave |
| 4 threads + t-640                  | 153.0.8010.12 | yes                 |           99.6% | powersave |
| t-416                              | 153.0.8010.12 | no                  |           98.8% | powersave |
| 2 threads                          | 153.0.8010.12 | yes                 |           98.9% | powersave |
| 4 threads                          | 153.0.8010.12 | yes                 |           98.7% | powersave |
| 8 threads                          | 153.0.8010.12 | yes                 |           98.3% | powersave |
| Reference (repeat midway)          | 153.0.8010.12 | no                  |           99.4% | powersave |
| Reference (repeat at the end)      | 153.0.8010.12 | no                  |           99.7% | powersave |
| Reference with ORT 1.24.3          | 153.0.8010.12 | no                  |           98.1% | powersave |
| Reference (t-384)                  | 153.0.8010.12 | no                  |           98.6% | powersave |
| t-512                              | 153.0.8010.12 | no                  |           99.1% | powersave |
| CCT-S v2                           | 153.0.8010.12 | no                  |           98.8% | powersave |
| CCT-XS v1                          | 153.0.8010.12 | no                  |           98.4% | powersave |
| Previous OCR (MobileViT v2)        | 153.0.8010.12 | no                  |           99.7% | powersave |
| Letterbox (t-384)                  | 153.0.8010.12 | no                  |           99.3% | powersave |
| CCT-S v1                           | 153.0.8010.12 | no                  |           98.2% | powersave |
| t-256                              | 153.0.8010.12 | no                  |           98.8% | powersave |

## Limitations

- **Two sessions:** phase 1 (18 variants) and phase 2 (6 combinations, same conditions) were run separately. Phase 2 variants have no reference repeat of their own (the phase 1 repeats cover the drift of that session).
- **A single pass per variant** (drift between repeats is under 1%, but there are no per-variant deviations).
- **CPU governor `powersave`** (amd-pstate-epp): it could not be changed without privileges. It affects the absolute timings, not the relative comparisons within the session.
- **Desktop hardware** (Ryzen 9 5900X, 12 cores) in the large benchmark. The phone measurement ([Measurement on real phones](#measurement-on-real-phones)) covers only two Android devices and 50 photos (72 plates): it is good for comparing configurations and estimating timings, not absolute accuracy, and there are no mid-range devices or iOS.
- **Partial ground truth** (2 hidden characters per plate) and the repeated-letter artifact.
- **A single dataset** of Spanish plates, mostly daytime and high-resolution photos. There is no measurement with live video or camera, nor the sustained heat test on a phone.
- **Unknown training contamination:** it is not known whether the detectors or OCR models saw images of this dataset.
- "Detections without an annotated plate" overestimates false positives, because some background plates are not annotated.
- Multithreading requires `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`, and serving the ORT glue files separately with `ort.env.wasm.wasmPaths`. Check that your hosting allows it.

## Recommendations and status

Applied in branch `feature/ocr-cct-v2` (commit `5d3e272`):

1. **CCT-XS v2 OCR** instead of the previous OCR and of CCT-S v2 (which was used first). The old model and configuration were removed.
2. **Detector threshold 0.25** (+4 pp measured).
3. **O/Q→0 and I→1 correction** in the numeric block of Spanish plates (4 digits + 3 consonants). The benchmark's +4 pp estimate used a broader rule. The implemented one is more conservative so it does not touch plates from other countries, and its exact effect was not measured.

Still to decide:

4. **Larger detector and multithreading.** t-640 with 4 threads gives 78.4% at 134 ms; s-608 with 4 threads gives 81.6% at 287 ms. They depend on being able to serve `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`, on the download size (t-640 model 15.6 MB, s-608 36.4 MB, against 7.8 MB) and on checking the behaviour on real phones.
5. **Measured on two real phones** ([Measurement on real phones](#measurement-on-real-phones)): t-640 with 4 threads is as fast as the current app on a high-end phone and faster on a 2018 OnePlus 6 (2,049 against 2,884 ms), with 7 more points of plates found. Battery use and heat under continuous use (it doubles the CPU use per image) and video/camera behaviour are still to be checked.
6. Update the documentation: "European plates" describes the previous model; CCT is global.
7. Do not show the region that CCT predicts.

## Reproducibility

The benchmark lives outside this repository. It has a script that builds every variant from the app (`git archive` plus patches), a runner that loads the models once per variant in a fresh Chromium and times the app's real Web Worker, and an analysis script that scores the results against the dataset's ground truth and generates the tables and charts on this page. Raw results are stored per variant as JSON, with the environment of each run.

## Citation and attributions

**UC3M-LP dataset** (license [ODbL-1.0](https://opendatacommons.org/licenses/odbl/1-0/)): https://github.com/ramajoballester/UC3M-LP · download: https://doi.org/10.21950/OS5W4Z · https://zenodo.org/records/17152029

Cite it as the dataset author requests:

```bibtex
@article{RamajoBallester2024,
    title = {Dual license plate recognition and visual features encoding for vehicle identification},
    journal = {Robotics and Autonomous Systems},
    volume = {172},
    pages = {104608},
    year = {2024},
    issn = {0921-8890},
    doi = {https://doi.org/10.1016/j.robot.2023.104608},
    url = {https://www.sciencedirect.com/science/article/pii/S0921889023002476},
    author = {Álvaro Ramajo-Ballester and José María {Armingol Moreno} and Arturo {de la Escalera Hueso}},
    keywords = {Deep learning, Public dataset, ALPR, License plate recognition, Vehicle re-identification, Object detection},
}
```

**Evaluated models:** [fast-plate-ocr](https://github.com/ankandrew/fast-plate-ocr), [open-image-models](https://github.com/ankandrew/open-image-models) and [fast-alpr](https://github.com/ankandrew/fast-alpr) (ankandrew, MIT license).

**Runtime:** [onnxruntime-web](https://github.com/microsoft/onnxruntime) 1.30.0 and 1.24.3. **Automation:** [Playwright](https://playwright.dev) on Chromium.
