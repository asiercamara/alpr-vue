---
title: 'Benchmark: OCR, Detector and Runtime Choices'
description: 'How the OCR model, plate detector and ONNX runtime used by ALPR Vue were compared on 1,975 real photos with ground truth: methods, results, limitations and recommendations.'
---

This page documents the benchmark behind the model choices in ALPR Vue: which OCR (optical character recognition) model, which license plate detector, which detection threshold and which ONNX Runtime Web setup. It lists what was tested, how, the full results and what we recommend. Results date from 2026-10-11, comparing branch `feature/ocr-cct-v2` against `develop` (ef429b1).

<VTDocNote>

**Dataset attribution.** All measurements use the **UC3M-LP** dataset by Álvaro Ramajo-Ballester, José María Armingol Moreno and Arturo de la Escalera Hueso (Universidad Carlos III de Madrid), published under the [ODbL-1.0](https://opendatacommons.org/licenses/odbl/1-0/) license.

- Repository: [ramajoballester/UC3M-LP](https://github.com/ramajoballester/UC3M-LP) on GitHub
- Download: [DOI 10.21950/OS5W4Z](https://doi.org/10.21950/OS5W4Z) (alternative: [Zenodo](https://zenodo.org/records/17152029))
- Paper (open access): [DOI 10.1016/j.robot.2023.104608](https://doi.org/10.1016/j.robot.2023.104608)

The dataset is not redistributed here; the images were used only for evaluation. If you reuse these results, cite the paper (full reference in [Citation and attributions](#citation-and-attributions)).

</VTDocNote>

All tables are generated automatically from the raw benchmark results. The benchmark scripts are not part of this repository.

## Summary

- **This branch against v1.0.0.** The setup of branch `feature/ocr-cct-v2` (CCT-XS v2 OCR, onnxruntime-web 1.30 and detector threshold 0.25) reads **74.8%** of the 2,547 plates in the dataset without error, against **65.2%** for the released v1.0.0, at almost the same speed (156 ms against 149 ms per image). The difference is significant (McNemar, p<0.001). [From v1.0.0 to this branch](#from-v1-0-0-to-this-branch) splits the gain by change.
- **OCR: CCT-XS v2 (global).** With the v1.0.0 detector it reads 70.9% of the plates against 65.2% for the previous OCR (European MobileViT v2), at the same speed (154 ms against 149 ms). CCT-S v2 is 54% slower (237 ms) and less accurate (68.4%), so it does not pay off.
- **The previous OCR does not load with onnxruntime-web 1.30** (shape inference error), so the runtime upgrade and the OCR change go together. With the same model, 1.24.3 and 1.30.0 give the same speed and the same results.
- **The biggest remaining lever is the detector, not the OCR.** With the v1.0.0 setup (YOLOv9-t at 384 px, threshold 0.6) the detector finds only 83.7% of the plates; with the branch's threshold 0.25 it finds 89.0%, at no time cost. Raising the resolution to 640 px on top of this branch gives **78.4%** (+3.6 points, 392 ms).
- **Multithreaded WebAssembly** (4 threads) cuts the time by about 2.8× (156 → 56 ms with this branch) without changing any result, at the price of about twice the total CPU time and of serving the app with COOP/COEP headers.
- **On real phones** (Oppo Find X9 Pro and OnePlus 6, 50 dataset photos) multithreading is what makes the larger detector viable: YOLOv9-t 640 with 4 threads finds 95.8% of the plates (88.9% for this branch) and takes 278 ms on the Oppo (250 ms this branch) and 2,049 ms on the OnePlus 6 (2,884 ms this branch). The 2018 OnePlus 6 processes only 0.34 photos per second with this branch, a key fact for a camera or video mode ([details](#measurement-on-real-phones)).
- **More accuracy is available, but this branch does not take it yet.** On the desktop, this branch + YOLOv9-t 640 + 4 threads reaches 78.4% at 134 ms per image, and YOLOv9-s 608 81.6% at 287 ms. Both depend on multithreading and on hardware that this benchmark did not cover, such as the rugged handhelds used in companies, so this branch keeps the t-384 detector ([why](#why-this-branch-keeps-the-t-384-detector)).
- **Discarded:** letterbox in the detector (loses 6 points), YOLOv9-t 256 (58.2%) and CCT-S v1 (61.3%, the worst and slowest OCR).

### From v1.0.0 to this branch

| Change (commit)                                                     | Read OK (of all) | Change vs. the previous row | ms/image |
| ------------------------------------------------------------------- | ---------------: | --------------------------: | -------: |
| v1.0.0: MobileViT v2 OCR, ORT 1.24.3, YOLOv9-t 384, threshold 0.6   |            65.2% |                           — |      149 |
| CCT-XS v2 OCR and onnxruntime-web 1.30 (`60c8d83`)                  |            70.9% |                     +5.7 pp |      154 |
| Detector threshold 0.6 → 0.25 (`a0d2d60`): **this branch**          |            74.8% |                     +4.0 pp |      156 |
| O/Q/I correction in the numeric block of Spanish plates (`80fa22e`) |            74.8% |      no effect on this data |        — |
| Rejection of plates cut by the frame edge (`407e88d`)               |                — |      not measured (history) |        — |

The O/Q/I correction only applies to 7-character readings with the shape of a current Spanish plate (4 digits + 3 consonants). In this dataset 2 characters of every plate are hidden, so readings have 5 or 6 characters and the rule never applies (0 of the 2,445 readings of this branch); it does on real plates. The edge rejection decides which plates reach the plate history, which the benchmark does not simulate. So, in every table, **This branch** reads exactly like the branch does.

### Recommendation

<VTDocCardGroup cols="3">
<VTDocCard title="This branch (applied)">

**74.8%** read OK · **156&nbsp;ms** per image

CCT-XS v2 + threshold 0.25 with the YOLOv9-t 384 detector. Works on one thread, without special headers.

</VTDocCard>
<VTDocCard title="Next step: 4 threads">

**74.8%** read OK · **56&nbsp;ms** per image

This branch with multithreaded WebAssembly: the same readings, faster. Needs COOP/COEP; without them it stays on one thread, as today.

</VTDocCard>
<VTDocCard title="Only for fast devices">

**78.4%** read OK · **134&nbsp;ms** per image

This branch + YOLOv9-t 640 + 4 threads. Not chosen for now (see below).

</VTDocCard>
</VTDocCardGroup>

<VTDocCheck>

**Already applied in branch `feature/ocr-cct-v2`:** CCT-XS v2 with the previous OCR removed, detector threshold 0.25, an O/Q/I correction for Spanish plates and the rejection of plates cut by the frame edge (see [Recommendations and status](#recommendations-and-status)). Multithreading is the next step; a larger detector is not planned for now.

</VTDocCheck>

### Why this branch keeps the t-384 detector

The larger detectors are more accurate on this dataset, but this branch keeps YOLOv9-t 384 because the app must work on modest phones and handhelds, where those gains are not guaranteed and the cost can be higher than today:

- **Low-end hardware was not measured.** The slowest device measured, a OnePlus 6 (Snapdragon 845, 2018), already takes 2.9 s per photo with this branch. Rugged handhelds and low-end phones used in companies often have older and slower processors.
- **t-640 only pays off with multithreading.** With 4 threads it is faster than this branch on the OnePlus 6 (2.0 s against 2.9 s), but multithreading needs COOP/COEP isolation, which a WebView or a browser managed in kiosk mode may not offer. On one thread t-640 is 2.4 times slower (7.0 s on the OnePlus 6).
- **More CPU, battery and download.** Multithreading doubles the CPU time per image, and heat under continuous use was not measured. The t-640 model weighs 15.6 MB against 7.8 MB, and s-608 36.4 MB.
- **This dataset exaggerates small plates.** In its photos of up to 64 MP the median plate is 34 px wide at the detector input, and that is where t-640 gains. With a handheld reader the operator aims at the plate, which then fills more of the frame: from 24 px wide this branch already finds 97–98% of the plates.

Multithreading with the same detector has none of these drawbacks: the readings do not change, and without isolation the app keeps running on one thread as it does now. A larger detector would only make sense chosen per device (for example, measuring a few inferences at start-up) and after measuring the target hardware.

## What was tested

### Starting point and models

- **Starting app** (`develop`, ef429b1, the same app code as the released **v1.0.0**): YOLOv9-t detector at 384 px (threshold 0.6), European MobileViT v2 OCR, onnxruntime-web 1.24.3, single-thread WebAssembly inference, image stretched to a square for the detector.
- **Model sources:** detector and OCR from [open-image-models](https://github.com/ankandrew/open-image-models) and [fast-plate-ocr](https://github.com/ankandrew/fast-plate-ocr) (ankandrew, MIT), the same projects the app uses.
- **CCT OCR** (Compact Convolutional Transformer): sizes XS and S, versions v1 and v2. The v2 models add a head that predicts the plate's country. Input 128×64 RGB, 36-character alphabet plus padding, 10 positions.
- **YOLOv9 detectors** exported with built-in NMS ("end2end"): t-256, t-384 (the current one), t-416, t-512, t-640 and s-608.

### Variants measured

24 variants in two phases, each one the real app built with the listed changes. Unless stated, each variant changes one thing on top of **CCT-XS v2, threshold 0.6**: v1.0.0 with only the OCR changed (CCT-XS v2, ORT 1.30.0, t-384 detector, threshold 0.6), so the effect of each change is measured on its own. The variants named **This branch** use threshold 0.25, like the branch.

| Variant                                                                                                                         | What changes                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| CCT-XS v2, threshold 0.6                                                                                                        | v1.0.0 with the CCT-XS v2 OCR and ORT 1.30.0 (t-384 detector, threshold 0.6): the base of the single-change variants                       |
| CCT-XS v2, threshold 0.6 (repeat midway), CCT-XS v2, threshold 0.6 (repeat at the end)                                          | Repeated midway and at the end of phase 1 (session drift)                                                                                  |
| v1.0.0 (MobileViT v2)                                                                                                           | The released app v1.0.0: European MobileViT v2 OCR with ORT 1.24.3                                                                         |
| CCT-XS v1, CCT-S v1, CCT-S v2                                                                                                   | Other CCT OCR models                                                                                                                       |
| CCT-XS v2, threshold 0.6, ORT 1.24.3                                                                                            | CCT-XS v2 with onnxruntime-web 1.24.3 (runtime effect)                                                                                     |
| 2 threads, 4 threads, 8 threads                                                                                                 | Multithreaded WebAssembly with 2, 4 (automatic) and 8 threads                                                                              |
| t-256, t-416, t-512, t-640                                                                                                      | YOLOv9-t detector at other resolutions                                                                                                     |
| s-608                                                                                                                           | YOLOv9-s detector at 608 px                                                                                                                |
| Letterbox (t-384)                                                                                                               | Letterbox instead of stretching the image                                                                                                  |
| **This branch**                                                                                                                 | CCT-XS v2 with detector confidence threshold 0.25 instead of 0.6: the setup of branch `feature/ocr-cct-v2`, and the reference of this page |
| This branch + t-640                                                                                                             | This branch with the t-640 detector                                                                                                        |
| 4 threads + t-640, 4 threads + s-608, This branch + 4 threads, This branch + t-640 + 4 threads, This branch + s-608 + 4 threads | The same combinations with 4 threads                                                                                                       |

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
- **Reference: This branch**, the setup of branch `feature/ocr-cct-v2` (CCT-XS v2, ORT 1.30.0, t-384 detector, threshold 0.25). Every Δ is measured against it. **v1.0.0 (MobileViT v2)** is the released app, and **CCT-XS v2, threshold 0.6** is the intermediate step with only the OCR changed.
- **Exact McNemar test** against this branch, on the same plates.
- **ms/image:** time from `postMessage` to the answer of the app's real Web Worker, median over the 1,975 images (image decoding is measured separately and excluded).

### Test bench

- The real app built per variant (`git archive` plus patches), served locally and run in Chromium (Playwright). The app's real `Worker` is what gets timed.
- **Models loaded once** per variant, 5 warm-up images discarded and one full pass over 1,975 images. A fresh Chromium per variant.
- **One variant at a time**, waiting for a free CPU (≥97%) before starting and without using the machine during the run.
- No crops are saved: the correct answer is already in the dataset.
- The variant CCT-XS v2, threshold 0.6 was repeated at the start, midway and at the end of the session to measure drift (see [Session drift](#session-drift)).

| Item              | Value                                                   |
| ----------------- | ------------------------------------------------------- |
| CPU               | AMD Ryzen 9 5900X 12-Core Processor (24 threads)        |
| RAM               | 63 GB                                                   |
| System            | CachyOS, Linux 7.2.9-2-cachyos                          |
| CPU governor      | powersave (amd-pstate-epp, preference power)            |
| Node / Playwright | v22.22.2 / 1.63.0                                       |
| Browser           | 153.0.8010.12 (Chromium, new headless)                  |
| App code          | feature/ocr-cct-v2 @ e993f87; v1.0.0: develop @ ef429b1 |
| onnxruntime-web   | 1.30.0 and 1.24.3                                       |

## Overall results

<VTDocFrame src="/benchmark/accuracy-ci.svg" alt="Dot chart of the share of plates read without error per variant, with 95% confidence intervals and a line at this branch (74.8%)." caption="Plates read without error, with the 95% confidence interval. Variants that only change speed (threads, ORT version, repeats) give the same result as their single-thread version and are left out. A hollow dot does not differ significantly from this branch." />

| Variant                                      | ms/image (median) |     p95 | Found | Read OK (of those found) |    Read OK (of all) | Δ vs. this branch | p (McNemar) |
| -------------------------------------------- | ----------------: | ------: | ----: | -----------------------: | ------------------: | ----------------: | ----------: |
| This branch + s-608 + 4 threads              |            287 ms |  300 ms | 96.9% |                    84.2% | 81.6% (80.0%–83.0%) |           +6.8 pp |      <0.001 |
| This branch + t-640                          |            392 ms |  421 ms | 94.5% |                    83.0% | 78.4% (76.8%–80.0%) |           +3.6 pp |      <0.001 |
| This branch + t-640 + 4 threads              |            134 ms |  145 ms | 94.5% |                    83.0% | 78.4% (76.8%–80.0%) |           +3.6 pp |      <0.001 |
| s-608                                        |           1039 ms | 1061 ms | 92.2% |                    84.9% | 78.3% (76.7%–79.9%) |           +3.5 pp |      <0.001 |
| 4 threads + s-608                            |            289 ms |  300 ms | 92.2% |                    84.9% | 78.3% (76.7%–79.9%) |           +3.5 pp |      <0.001 |
| **This branch**                              |            156 ms |  176 ms | 89.0% |                    84.0% | 74.8% (73.1%–76.5%) |                 — |           — |
| This branch + 4 threads                      |             56 ms |   66 ms | 89.0% |                    84.0% | 74.8% (73.1%–76.5%) |           +0.0 pp |       1.000 |
| t-640                                        |            393 ms |  416 ms | 88.7% |                    83.9% | 74.4% (72.6%–76.0%) |           -0.5 pp |       0.591 |
| 4 threads + t-640                            |            132 ms |  143 ms | 88.7% |                    83.9% | 74.4% (72.6%–76.0%) |           -0.5 pp |       0.591 |
| t-416                                        |            182 ms |  201 ms | 84.4% |                    84.2% | 71.0% (69.2%–72.8%) |           -3.8 pp |      <0.001 |
| 2 threads                                    |             88 ms |  101 ms | 83.7% |                    84.7% | 70.9% (69.1%–72.6%) |           -4.0 pp |      <0.001 |
| 4 threads                                    |             56 ms |   65 ms | 83.7% |                    84.7% | 70.9% (69.1%–72.6%) |           -4.0 pp |      <0.001 |
| 8 threads                                    |             47 ms |   57 ms | 83.7% |                    84.7% | 70.9% (69.1%–72.6%) |           -4.0 pp |      <0.001 |
| CCT-XS v2, threshold 0.6 (repeat midway)     |            153 ms |  171 ms | 83.7% |                    84.7% | 70.9% (69.1%–72.6%) |           -4.0 pp |      <0.001 |
| CCT-XS v2, threshold 0.6 (repeat at the end) |            154 ms |  171 ms | 83.7% |                    84.7% | 70.9% (69.1%–72.6%) |           -4.0 pp |      <0.001 |
| CCT-XS v2, threshold 0.6, ORT 1.24.3         |            152 ms |  170 ms | 83.7% |                    84.7% | 70.9% (69.1%–72.6%) |           -4.0 pp |      <0.001 |
| CCT-XS v2, threshold 0.6                     |            154 ms |  172 ms | 83.7% |                    84.7% | 70.9% (69.1%–72.6%) |           -4.0 pp |      <0.001 |
| t-512                                        |            266 ms |  285 ms | 82.3% |                    84.2% | 69.3% (67.5%–71.1%) |           -5.5 pp |      <0.001 |
| CCT-S v2                                     |            237 ms |  337 ms | 83.7% |                    81.7% | 68.4% (66.6%–70.2%) |           -6.4 pp |      <0.001 |
| CCT-XS v1                                    |            152 ms |  168 ms | 83.7% |                    81.3% | 68.0% (66.2%–69.8%) |           -6.8 pp |      <0.001 |
| v1.0.0 (MobileViT v2)                        |            149 ms |  165 ms | 83.7% |                    77.9% | 65.2% (63.3%–67.0%) |           -9.7 pp |      <0.001 |
| Letterbox (t-384)                            |            153 ms |  169 ms | 77.7% |                    83.5% | 64.9% (63.0%–66.7%) |          -10.0 pp |      <0.001 |
| CCT-S v1                                     |            312 ms |  488 ms | 83.7% |                    73.3% | 61.3% (59.4%–63.2%) |          -13.5 pp |      <0.001 |
| t-256                                        |             79 ms |   95 ms | 69.7% |                    83.4% | 58.2% (56.3%–60.1%) |          -16.6 pp |      <0.001 |

Why several rows have identical accuracy: the "2 threads", "4 threads", "8 threads" and "CCT-XS v2, threshold 0.6, ORT 1.24.3" rows change only speed or runtime and produce **exactly the same readings** as CCT-XS v2, threshold 0.6, and "This branch + 4 threads" reads exactly like this branch. They confirm that multithreading and the ORT version change do not alter the result. The single-change variants (t-640, s-608, the other OCR models…) keep threshold 0.6, so their Δ against this branch includes the 4 points that threshold costs.

<VTDocFrame src="/benchmark/speed-vs-accuracy.svg" alt="Scatter chart of median time per image (log scale) against the share of plates read without error, for every variant." caption="Speed against accuracy, per variant. Hollow dots run on one thread and filled dots are multithreaded. The dashed line joins the variants that no other variant beats on both speed and accuracy." />

## Detector

| Variant                                      | Recall IoU ≥ 0.5 (95% CI) | Recall IoU ≥ 0.3 | Detections without an annotated plate | recall <16 px | recall 16–24 | recall 24–32 | recall 32–48 | recall ≥48 |
| -------------------------------------------- | ------------------------: | ---------------: | ------------------------------------: | ------------: | -----------: | -----------: | -----------: | ---------: |
| This branch + s-608 + 4 threads              |       96.9% (96.2%–97.5%) |            97.4% |                                   265 |           82% |          97% |          99% |         100% |       100% |
| This branch + t-640                          |       94.5% (93.5%–95.3%) |            95.6% |                                   220 |           78% |          96% |          97% |          98% |        95% |
| This branch + t-640 + 4 threads              |       94.5% (93.5%–95.3%) |            95.6% |                                   220 |           78% |          96% |          97% |          98% |        95% |
| s-608                                        |       92.2% (91.1%–93.2%) |            92.5% |                                   105 |           50% |          95% |          98% |          99% |        99% |
| 4 threads + s-608                            |       92.2% (91.1%–93.2%) |            92.5% |                                   105 |           50% |          95% |          98% |          99% |        99% |
| This branch                                  |       89.0% (87.8%–90.2%) |            90.5% |                                   141 |           35% |          90% |          97% |          98% |        98% |
| This branch + 4 threads                      |       89.0% (87.8%–90.2%) |            90.5% |                                   141 |           35% |          90% |          97% |          98% |        98% |
| t-640                                        |       88.7% (87.4%–89.8%) |            89.3% |                                    83 |           47% |          93% |          96% |          96% |        92% |
| 4 threads + t-640                            |       88.7% (87.4%–89.8%) |            89.3% |                                    83 |           47% |          93% |          96% |          96% |        92% |
| t-416                                        |       84.4% (82.9%–85.7%) |            85.7% |                                    92 |           25% |          85% |          95% |          96% |        90% |
| 2 threads                                    |       83.7% (82.2%–85.1%) |            84.4% |                                    60 |           16% |          80% |          95% |          97% |        96% |
| 4 threads                                    |       83.7% (82.2%–85.1%) |            84.4% |                                    60 |           16% |          80% |          95% |          97% |        96% |
| 8 threads                                    |       83.7% (82.2%–85.1%) |            84.4% |                                    60 |           16% |          80% |          95% |          97% |        96% |
| CCT-XS v2, threshold 0.6 (repeat midway)     |       83.7% (82.2%–85.1%) |            84.4% |                                    60 |           16% |          80% |          95% |          97% |        96% |
| CCT-XS v2, threshold 0.6 (repeat at the end) |       83.7% (82.2%–85.1%) |            84.4% |                                    60 |           16% |          80% |          95% |          97% |        96% |
| CCT-XS v2, threshold 0.6                     |       83.7% (82.2%–85.1%) |            84.4% |                                    60 |           16% |          80% |          95% |          97% |        96% |
| t-512                                        |       82.3% (80.8%–83.8%) |            82.8% |                                    70 |           24% |          84% |          91% |          94% |        90% |
| Letterbox (t-384)                            |       77.7% (76.0%–79.3%) |            78.0% |                                    56 |            7% |          56% |          90% |          96% |        97% |
| t-256                                        |       69.7% (67.9%–71.5%) |            70.7% |                                    30 |            2% |          36% |          78% |          93% |        92% |

<VTDocFrame src="/benchmark/recall-by-size.svg" alt="Two line charts of the share of plates found by plate width at the 384 px input: one compares detector sizes, the other the threshold and letterbox." caption="Plates found (IoU ≥ 0.5) by plate width at the 384 px input. Left: detector input size. Right: detection threshold and letterbox. The grey line is the detector setup of v1.0.0 (t-384, threshold 0.6) in both." />

Reading the results:

- The v1.0.0 detector setup (t-384, threshold 0.6) misses 16.3% of the plates, mostly the small ones: with a width under 16 px at the input it finds only 16%, and between 16 and 24 px it finds 80%. With the threshold of this branch (0.25) it misses 11.0%, and finds 35% and 90% of those small plates.
- **Resolution:** a higher resolution finds more small plates (t-640: 47% of those under 16 px), but the effect is not monotonic. **t-512 (82.3%) is worse than t-384 (83.7%)**, and on large plates (≥48 px) t-416, t-512 and t-640 do worse than t-384 (90–92% against 96%). Each YOLO model exported at another size behaves differently, so the size has to be chosen by measuring, not by interpolation.
- **Threshold 0.25 (this branch):** it is free in time. It raises recall on every detector (+5.3 pp with t-384, +5.8 pp with t-640, +4.7 pp with s-608) at the cost of more detections without an annotated plate (141 instead of 60 with t-384). The app's quality and confidence filters should discard some of them; how many was not measured.
- **YOLOv9-s 608** is the best detector measured (92.2% at threshold 0.6; 96.9% at 0.25), but its model is 36.4 MB against 7.8 MB and it costs 1,039 ms per image on a single thread (289 ms with 4 threads).
- **Letterbox** (keeping the aspect ratio instead of stretching the image to a square) is much worse (77.7%): the photos are 4:3 and letterbox shrinks the plate by 25%. The app stretches the image and the model works well that way.

### Detector threshold sweep

The sweeps are computed by filtering the detections of the run made with threshold 0.25.

<VTDocTabs>
<VTDocTab title="t-384 (this branch)">

| Detector threshold | Recall IoU ≥ 0.5 | Detections without an annotated plate | Read OK (of all) |
| ------------------ | ---------------: | ------------------------------------: | ---------------: |
| 0.25               |            89.0% |                                   141 |            74.8% |
| 0.3                |            88.5% |                                   119 |            74.4% |
| 0.4                |            87.5% |                                    94 |            73.6% |
| 0.5                |            85.9% |                                    77 |            72.4% |
| 0.6                |            83.7% |                                    60 |            70.9% |
| 0.7                |            79.7% |                                    37 |            67.7% |

</VTDocTab>
<VTDocTab title="t-640">

| Detector threshold | Recall IoU ≥ 0.5 | Detections without an annotated plate | Read OK (of all) |
| ------------------ | ---------------: | ------------------------------------: | ---------------: |
| 0.25               |            94.5% |                                   220 |            78.4% |
| 0.3                |            93.7% |                                   192 |            77.8% |
| 0.4                |            92.5% |                                   144 |            76.9% |
| 0.5                |            90.8% |                                   109 |            75.8% |
| 0.6                |            88.7% |                                    83 |            74.4% |
| 0.7                |            84.1% |                                    53 |            71.1% |

</VTDocTab>
<VTDocTab title="s-608 + 4 threads">

| Detector threshold | Recall IoU ≥ 0.5 | Detections without an annotated plate | Read OK (of all) |
| ------------------ | ---------------: | ------------------------------------: | ---------------: |
| 0.25               |            96.9% |                                   265 |            81.6% |
| 0.3                |            96.5% |                                   233 |            81.2% |
| 0.4                |            95.5% |                                   180 |            80.7% |
| 0.5                |            94.4% |                                   138 |            79.9% |
| 0.6                |            92.2% |                                   105 |            78.3% |
| 0.7                |            89.0% |                                    74 |            76.2% |

</VTDocTab>
</VTDocTabs>

The v1.0.0 threshold (0.6) is very conservative: lowering it to 0.25, as this branch does, keeps improving the final result. The cost is more detections without an annotated plate (from 60 to 141 with t-384).

## OCR

The OCR models are compared with the v1.0.0 detector setup (t-384, threshold 0.6), so that only the OCR changes.

| OCR                                  | Read OK (of those found, 95% CI) | Errors per visible character | Mean confidence | ms/img |
| ------------------------------------ | -------------------------------: | ---------------------------: | --------------: | -----: |
| CCT-XS v2, threshold 0.6, ORT 1.24.3 |              84.7% (83.1%–86.1%) |                        0.035 |           95.6% | 152 ms |
| CCT-XS v2                            |              84.7% (83.1%–86.1%) |                        0.035 |           95.6% | 154 ms |
| CCT-S v2                             |              81.7% (80.0%–83.3%) |                        0.042 |           94.4% | 237 ms |
| CCT-XS v1                            |              81.3% (79.6%–82.9%) |                        0.042 |           93.8% | 152 ms |
| v1.0.0 (MobileViT v2)                |              77.9% (76.0%–79.6%) |                        0.057 |           71.1% | 149 ms |
| CCT-S v1                             |              73.3% (71.3%–75.1%) |                        0.063 |           91.6% | 312 ms |

- **CCT-XS v2** is the best and matches the speed of the previous OCR. **CCT-S v2** does not improve (81.7% against 84.7% of those found) and is 54% slower. The v1 version of both is worse than v2.
- **Errors per visible character:** 0.035 (XS v2) against 0.057 (previous), 39% fewer.
- **Confidence:** the previous OCR's confidence is low and barely discriminating (mean 71%, nothing above 0.9). The CCT models are much better calibrated: when CCT-XS v2 reports more than 0.9, it is right 89% of the time.

| OCR                   | conf 0–0.5 (n · accuracy) | conf 0.5–0.7 (n · accuracy) | conf 0.7–0.9 (n · accuracy) | conf 0.9–1 (n · accuracy) |
| --------------------- | ------------------------: | --------------------------: | --------------------------: | ------------------------: |
| v1.0.0 (MobileViT v2) |                  90 · 16% |                   725 · 65% |                  1317 · 89% |                     0 · – |
| CCT-XS v1             |                   9 · 11% |                    26 · 15% |                   464 · 67% |                1633 · 87% |
| CCT-S v1              |                    5 · 0% |                    30 · 10% |                   779 · 53% |                1318 · 87% |
| CCT-S v2              |                   11 · 9% |                    38 · 18% |                   386 · 63% |                1697 · 88% |
| CCT-XS v2             |                   8 · 13% |                    15 · 40% |                   326 · 67% |                1783 · 89% |

### Effect on the plate history

A simulation of the app's filters (mean confidence ≥ confidence threshold and quality score ≥ 0.7): which plates would reach the plate history and how many would be correct.

| Variant               | Confidence threshold | Reach the history | History precision | Correct plates in the history (of all) |
| --------------------- | -------------------: | ----------------: | ----------------: | -------------------------------------: |
| v1.0.0 (MobileViT v2) |                  0.5 |              1342 |             88.7% |                                  46.7% |
| v1.0.0 (MobileViT v2) |                  0.7 |              1327 |             88.6% |                                  46.2% |
| v1.0.0 (MobileViT v2) |                  0.9 |                 0 |              0.0% |                                   0.0% |
| CCT-XS v1             |                  0.5 |              2103 |             82.1% |                                  67.8% |
| CCT-XS v1             |                  0.7 |              2102 |             82.1% |                                  67.7% |
| CCT-XS v1             |                  0.9 |              1637 |             86.6% |                                  55.6% |
| CCT-S v2              |                  0.5 |              2089 |             83.0% |                                  68.0% |
| CCT-S v2              |                  0.7 |              2089 |             83.0% |                                  68.0% |
| CCT-S v2              |                  0.9 |              1702 |             87.5% |                                  58.5% |
| CCT-XS v2             |                  0.5 |              2108 |             84.9% |                                  70.3% |
| CCT-XS v2             |                  0.7 |              2108 |             84.9% |                                  70.3% |
| CCT-XS v2             |                  0.9 |              1788 |             88.4% |                                  62.0% |

With the previous OCR (v1.0.0) and the app's current thresholds only **46.7%** of all plates reach the history correctly read; with CCT-XS v2 it is **70.3%**. Part of that gain comes from the new model's confidence being higher and more informative. If the previous OCR were kept, the thresholds would need recalibrating.

### Breakdown

v1.0.0 against this branch, by lighting and plate type.

| Group                          | Plates | Found (this branch) | v1.0.0 (MobileViT v2): read OK of all | This branch: read OK of all |
| ------------------------------ | -----: | ------------------: | ------------------------------------: | --------------------------: |
| Day                            |   2185 |                 90% |                                   66% |                         75% |
| Night                          |    362 |                 86% |                                   62% |                         72% |
| Type A (standard)              |   2498 |                 89% |                                   66% |                         75% |
| Type B (double-row motorcycle) |     31 |                 84% |                                   19% |                         65% |
| Type C (light motorcycle)      |      1 |                100% |                                    0% |                          0% |
| Type D (taxi/private hire)     |     11 |                100% |                                   18% |                         55% |
| Type E (trailer)               |      6 |                 33% |                                    0% |                         33% |

Types C and E have 1 and 6 plates, so they are not conclusive. Double-row motorcycle plates (type B, 31 plates) go from 19% with v1.0.0 to 65% with this branch.

### Region head (v2 models only)

| Model     | Predicts "Spain" | "Unknown" | Other regions (top 3)                   |
| --------- | ---------------: | --------: | --------------------------------------- |
| CCT-S v2  |            37.2% |      0.1% | Estonia 629, Austria 218, Belgium 117   |
| CCT-XS v2 |             4.7% |      0.0% | Estonia 1137, Portugal 315, Belgium 200 |

The CCT region head is **not reliable on Spanish plates** (CCT-XS v2 answers "Spain" 4.7% of the time and mostly "Estonia"). The app only passes it along and never shows it, so avoid using it in the interface.

## Errors and measurement quality

### Session drift

| Repeat of CCT-XS v2, threshold 0.6           | Median ms/image | Difference from the first | Read OK (of all) |
| -------------------------------------------- | --------------: | ------------------------: | ---------------: |
| CCT-XS v2, threshold 0.6                     |          154 ms |                         — |            70.9% |
| CCT-XS v2, threshold 0.6 (repeat midway)     |          153 ms |                     -0.7% |            70.9% |
| CCT-XS v2, threshold 0.6 (repeat at the end) |          154 ms |                      0.1% |            70.9% |

The variant CCT-XS v2, threshold 0.6, repeated midway and at the end of phase 1 (about 3 h) varies by less than 1% in time and gives exactly the same accuracy, so measurements within the session are comparable.

### Errors of this branch

Edit operations of this branch (CCT-XS v2, threshold 0.25) on the plates found: substitutions 258, missing characters 158, extra characters 9.

| Confusion (true→read) | Times |
| --------------------- | ----: |
| 0→O                   |    43 |
| Y→I                   |     4 |
| V→I                   |     3 |
| P→Y                   |     3 |
| W→S                   |     3 |
| N→W                   |     3 |
| 0→D                   |     3 |
| W→M                   |     3 |
| L→Z                   |     3 |
| 1→I                   |     3 |
| V→N                   |     3 |
| H→P                   |     2 |
| N→I                   |     2 |
| Z→R                   |     2 |

Of the 362 readings with at least one error from this branch, 71 (20%) are fixed by removing a repeated letter (the dataset's grey box is read as a copy of its neighbour), so part of those failures are an artifact of the anonymisation.

The dominant confusion is **0→O** (43 cases). Spanish plates have no vowels and no Q, so correcting O/Q→0 and I→1 offline in any position would raise this branch from 74.8% to 79.0% of plates read without error. The correction the branch applies is stricter (only 7-character readings shaped like a current Spanish plate, so it never touches other formats) and never applies on this dataset, where the grey boxes leave readings of 5 or 6 characters. On real plates it should recover part of those 4 points.

### Grey box artifact

About one fifth of the failures of this branch are fixed by removing a duplicated letter next to the grey box. On real photos without that masking, the accuracy should be somewhat higher than measured.

### Specific cases

<VTDocAccordionGroup>
<VTDocAccordion title="Worst readings of this branch">

| Image       | True (· = hidden) | Reading of this branch | Confidence |
| ----------- | ----------------- | ---------------------- | ---------: |
| train/00449 | `·007C·S`         | ``                     |         0% |
| train/00451 | `·007C·S`         | ``                     |         0% |
| train/01126 | `191·LR·`         | `C__497`               |        21% |
| train/00849 | `62·6·DF`         | `GR6310`               |        41% |
| train/00004 | `01·3·TD`         | `UA33T`                |        62% |
| train/00108 | `9·17·NB`         | `11IB`                 |        72% |
| train/00158 | `99·0·GB`         | `99S88`                |        74% |
| train/00559 | `05·9·BF`         | `O59`                  |        69% |
| train/00997 | `C5·48BS·`        | `G5468S`               |        69% |
| train/01311 | `677·LV·`         | `877LVSSP`             |        82% |
| train/01863 | `906··WY`         | `806TR`                |        76% |
| train/00002 | `38·3·PV`         | `383PYI`               |        76% |
| train/00003 | `874··HP`         | `B874LPP`              |        70% |
| train/00131 | `0·66·RF`         | `O66RFF`               |        97% |
| train/00156 | `19·7·NV`         | `19TN`                 |        81% |

</VTDocAccordion>
<VTDocAccordion title="Cases where v1.0.0 is right and this branch is not">

| Image       | True (· = hidden) | v1.0.0 (MobileViT v2) | This branch |
| ----------- | ----------------- | --------------------- | ----------- |
| train/00010 | `6·14·BM`         | `614BM`               | `614BMM`    |
| train/00019 | `88·0CC·`         | `880CC`               | `88OCC`     |
| train/00026 | `24·0JV·`         | `240JV`               | `24OJV`     |
| train/00028 | `1·15·GX`         | `115GX`               | `115GXX`    |
| train/00067 | `0·35·XN`         | `035XN`               | `O35XN`     |
| train/00090 | `0·21·HY`         | `021HHY`              | `O21HY`     |
| train/00102 | `·769F·Y`         | `769FY`               | `769FI`     |
| train/00107 | `M94·0W·`         | `M940W`               | `M94OW`     |
| train/00109 | `·019F·Y`         | `019FY`               | `019FI`     |
| train/00111 | `22·5G·N`         | `225GN`               | `225GH`     |
| train/00118 | `0·56CZ·`         | `056CZ`               | `O56CZ`     |
| train/00144 | `89·1·RZ`         | `891RRZ`              | `891RR`     |

</VTDocAccordion>
<VTDocAccordion title="Large plates that this branch does not find">

| Image       | True (· = hidden) | Width at the 384 input | Type/light |
| ----------- | ----------------- | ---------------------: | ---------- |
| train/00494 | `0·60·GR`         |                 166 px | BN         |
| train/01139 | `433··PY`         |                 126 px | AD         |
| train/00106 | `00·1·DM`         |                 100 px | AD         |
| train/00796 | `785·H·B`         |                  90 px | AD         |
| train/01952 | `769··BH`         |                  83 px | AD         |
| train/00430 | `89·0JZ·`         |                  73 px | AN         |
| train/00439 | `414··NC`         |                  63 px | AN         |
| test/00818  | `7·03C·M`         |                  53 px | BD         |
| train/00431 | `77·2D·X`         |                  50 px | AN         |
| train/00429 | `30·5·XM`         |                  47 px | AN         |
| train/00429 | `58·3GT·`         |                  47 px | AN         |
| train/00424 | `·661·XM`         |                  46 px | AN         |

</VTDocAccordion>
</VTDocAccordionGroup>

## Performance, memory and size

| Variant                                      | Model loading | First image (cold) | Median ms/image |     p95 | Browser CPU ms/image | Peak memory (MB) | Image decoding (median) |
| -------------------------------------------- | ------------: | -----------------: | --------------: | ------: | -------------------: | ---------------: | ----------------------: |
| 8 threads                                    |       1163 ms |              84 ms |           47 ms |   57 ms |               988 ms |             2352 |                   62 ms |
| This branch + 4 threads                      |       1074 ms |              92 ms |           56 ms |   66 ms |               487 ms |             2533 |                   61 ms |
| 4 threads                                    |       1097 ms |              93 ms |           56 ms |   65 ms |               488 ms |             1828 |                   62 ms |
| t-256                                        |       1084 ms |              99 ms |           79 ms |   95 ms |               177 ms |             2231 |                   61 ms |
| 2 threads                                    |       1136 ms |             123 ms |           88 ms |  101 ms |               294 ms |             2049 |                   62 ms |
| 4 threads + t-640                            |       1165 ms |             178 ms |          132 ms |  143 ms |               745 ms |             1755 |                   61 ms |
| This branch + t-640 + 4 threads              |       1190 ms |             188 ms |          134 ms |  145 ms |               745 ms |             1582 |                   60 ms |
| v1.0.0 (MobileViT v2)                        |       1230 ms |             185 ms |          149 ms |  165 ms |               249 ms |             1802 |                   60 ms |
| CCT-XS v2, threshold 0.6, ORT 1.24.3         |       1073 ms |             196 ms |          152 ms |  170 ms |               254 ms |             2034 |                   61 ms |
| CCT-XS v1                                    |       1171 ms |             183 ms |          152 ms |  168 ms |               254 ms |             1768 |                   61 ms |
| CCT-XS v2, threshold 0.6 (repeat midway)     |       1168 ms |             174 ms |          153 ms |  171 ms |               253 ms |             1784 |                   60 ms |
| Letterbox (t-384)                            |       1157 ms |             174 ms |          153 ms |  169 ms |               253 ms |             2034 |                   61 ms |
| CCT-XS v2, threshold 0.6                     |       1236 ms |             182 ms |          154 ms |  172 ms |               254 ms |             1885 |                   61 ms |
| CCT-XS v2, threshold 0.6 (repeat at the end) |       1175 ms |             175 ms |          154 ms |  171 ms |               255 ms |             2043 |                   60 ms |
| This branch                                  |       1166 ms |             180 ms |          156 ms |  176 ms |               258 ms |             2048 |                   60 ms |
| t-416                                        |       1214 ms |             213 ms |          182 ms |  201 ms |               285 ms |             2060 |                   61 ms |
| CCT-S v2                                     |       1200 ms |             256 ms |          237 ms |  337 ms |               349 ms |             1508 |                   60 ms |
| t-512                                        |       1276 ms |             303 ms |          266 ms |  285 ms |               369 ms |             1533 |                   60 ms |
| This branch + s-608 + 4 threads              |       1339 ms |             351 ms |          287 ms |  300 ms |              1388 ms |             1600 |                   60 ms |
| 4 threads + s-608                            |       1368 ms |             342 ms |          289 ms |  300 ms |              1391 ms |             1848 |                   60 ms |
| CCT-S v1                                     |       1202 ms |             351 ms |          312 ms |  488 ms |               436 ms |             1522 |                   61 ms |
| This branch + t-640                          |       1355 ms |             433 ms |          392 ms |  421 ms |               505 ms |             2099 |                   61 ms |
| t-640                                        |       1388 ms |             426 ms |          393 ms |  416 ms |               504 ms |             1587 |                   61 ms |
| s-608                                        |       2008 ms |            1036 ms |         1039 ms | 1061 ms |              1154 ms |             1599 |                   61 ms |

- **Multithreading:** 4 threads give 56 ms against 154–156 ms with one thread (the same for CCT-XS v2 at threshold 0.6 and for this branch), 8 threads 47 ms and 2 threads 88 ms. The cost is CPU time: about 488 ms of CPU per image with 4 threads against 254 ms with one. On a phone with fewer cores the gain will be smaller.
- **Memory:** the browser's peak RSS (1.5–2.5 GB) is dominated by decoding photos of up to 64 MP in this test, not by the models, and it is noisy between runs. It is not a reliable comparison between models.
- **Decoding the image** costs more than inference with 4 threads (60 ms median, 150 ms for 64 MP) and does not depend on the model. With real camera frames, or when resizing first, this part changes.
- **Model loading:** 1.1–1.4 s for the small detector, 2.0 s for s-608.
- **First image** (cold): about 30 ms more than the median.

<VTDocAccordionGroup>
<VTDocAccordion title="Inference and decoding time by image resolution">

| Resolution | Images | Inference t-384 (median) | Decoding (median) |
| ---------- | -----: | -----------------------: | ----------------: |
| 5184×3888  |    822 |                   156 ms |             53 ms |
| 6960×4640  |    820 |                   155 ms |             76 ms |
| 9248×6944  |    162 |                   159 ms |            150 ms |
| 2048×1536  |     77 |                   152 ms |             10 ms |
| 2016×4480  |     46 |                   153 ms |             23 ms |
| 4480×2016  |     36 |                   151 ms |             30 ms |
| 6944×9248  |      6 |                   154 ms |            150 ms |
| 1536×2048  |      5 |                   155 ms |             10 ms |
| 4624×3472  |      1 |                   140 ms |             44 ms |

</VTDocAccordion>
<VTDocAccordion title="Model size per variant">

| Variant                                      | Detector (MB) | OCR (MB) | Total models (MB) |
| -------------------------------------------- | ------------: | -------: | ----------------: |
| This branch + s-608 + 4 threads              |          36.4 |      8.3 |              44.7 |
| This branch + t-640                          |          15.6 |      8.3 |              23.9 |
| This branch + t-640 + 4 threads              |          15.6 |      8.3 |              23.9 |
| s-608                                        |          36.4 |      8.3 |              44.7 |
| 4 threads + s-608                            |          36.4 |      8.3 |              44.7 |
| This branch                                  |           7.8 |      8.3 |              16.1 |
| This branch + 4 threads                      |           7.8 |      8.3 |              16.1 |
| t-640                                        |          15.6 |      8.3 |              23.9 |
| 4 threads + t-640                            |          15.6 |      8.3 |              23.9 |
| t-416                                        |          15.5 |      8.3 |              23.9 |
| 2 threads                                    |           7.8 |      8.3 |              16.1 |
| 4 threads                                    |           7.8 |      8.3 |              16.1 |
| 8 threads                                    |           7.8 |      8.3 |              16.1 |
| CCT-XS v2, threshold 0.6 (repeat midway)     |           7.8 |      8.3 |              16.1 |
| CCT-XS v2, threshold 0.6 (repeat at the end) |           7.8 |      8.3 |              16.1 |
| CCT-XS v2, threshold 0.6, ORT 1.24.3         |           7.8 |      8.3 |              16.1 |
| CCT-XS v2, threshold 0.6                     |           7.8 |      8.3 |              16.1 |
| t-512                                        |          15.6 |      8.3 |              23.9 |
| CCT-S v2                                     |           7.8 |     10.2 |              18.0 |
| CCT-XS v1                                    |           7.8 |      7.1 |              14.9 |
| v1.0.0 (MobileViT v2)                        |           7.8 |      5.0 |              12.8 |
| Letterbox (t-384)                            |           7.8 |      8.3 |              16.1 |
| CCT-S v1                                     |           7.8 |     12.6 |              20.4 |
| t-256                                        |          15.5 |      8.3 |              23.9 |

</VTDocAccordion>
</VTDocAccordionGroup>

### Measurement on real phones

To check whether the desktop benchmark extrapolates, the same app pipeline (stretch to a square, YOLOv9, threshold 0.25, NMS, CCT-XS v2 and digit correction) was measured on two Android phones with a separate test web page. It uses a subset of **50 dataset photos** (72 plates, resized to 1,600 px on the long side) and 4 detector configurations, all with the same OCR. Models and images are loaded before measuring, so timings include neither loading nor decoding. The configuration of this branch (t-384, threshold 0.25, CCT-XS v2, as in the rest of the page) is repeated at the end to measure drift. v1.0.0 was not measured on phones. The page reproduces the app's boxes, texts and confidences exactly on the same 50 photos (0 differences), and it was also run on the reference PC (Firefox).

| Device                            | Browser              | System     | Cores reported | COOP/COEP isolation |
| --------------------------------- | -------------------- | ---------- | -------------- | ------------------- |
| Oppo Find X9 Pro (high end, 2025) | Chrome 155 (Android) | Android 16 | 5              | yes                 |
| OnePlus 6 (2018)                  | Chrome 155 (Android) | Android 11 | 7              | yes                 |
| Ryzen 9 5900X PC (reference)      | Firefox 157          | Linux      | 8              | yes                 |

<VTDocFrame src="/benchmark/phones.svg" alt="Dot chart of the median time per photo for each detector configuration on the Oppo Find X9 Pro, the OnePlus 6 and the reference PC, on a log scale." caption="Median time per photo on each device (log scale). The PC was measured only with one thread." />

The tables below show one device at a time; choosing a device in one of them switches all three.

<VTDocTabs sync-key="benchmark-device">
<VTDocTab title="Oppo Find X9 Pro" value="oppo">

| Configuration                               | ms/image (median) | ms/image p95 | Images/s | Found | Read OK (of all) | × the PC |
| ------------------------------------------- | ----------------: | -----------: | -------: | ----: | ---------------: | -------: |
| YOLOv9-t 384, 1 thread (this branch)        |               250 |          321 |     3.79 | 88.9% |            69.4% |      1.7 |
| YOLOv9-t 640, 1 thread                      |               521 |          641 |     1.86 | 95.8% |            72.2% |      1.4 |
| YOLOv9-t 640, 4 threads                     |               278 |          345 |     3.50 | 95.8% |            72.2% |        — |
| YOLOv9-s 608, 4 threads                     |               579 |          772 |     1.69 | 94.4% |            75.0% |        — |
| YOLOv9-t 384, 1 thread, repeated at the end |               242 |          313 |     4.07 | 88.9% |            69.4% |        — |

</VTDocTab>
<VTDocTab title="OnePlus 6" value="oneplus-6">

| Configuration                               | ms/image (median) | ms/image p95 | Images/s | Found | Read OK (of all) | × the PC |
| ------------------------------------------- | ----------------: | -----------: | -------: | ----: | ---------------: | -------: |
| YOLOv9-t 384, 1 thread (this branch)        |              2884 |         3509 |     0.34 | 88.9% |            69.4% |     19.1 |
| YOLOv9-t 640, 1 thread                      |              7038 |         7821 |     0.14 | 95.8% |            72.2% |     18.4 |
| YOLOv9-t 640, 4 threads                     |              2049 |         2323 |     0.48 | 95.8% |            72.2% |        — |
| YOLOv9-s 608, 4 threads                     |              5560 |         5855 |     0.18 | 94.4% |            75.0% |        — |
| YOLOv9-t 384, 1 thread, repeated at the end |              2859 |         3484 |     0.34 | 88.9% |            69.4% |        — |

</VTDocTab>
<VTDocTab title="PC (reference)" value="pc">

| Configuration                        | ms/image (median) | ms/image p95 | Images/s | Found | Read OK (of all) | × the PC |
| ------------------------------------ | ----------------: | -----------: | -------: | ----: | ---------------: | -------: |
| YOLOv9-t 384, 1 thread (this branch) |               151 |          178 |     6.42 | 88.9% |            63.9% |        1 |
| YOLOv9-t 640, 1 thread               |               382 |          421 |     2.59 | 95.8% |            73.6% |        1 |

</VTDocTab>
</VTDocTabs>

<VTDocTabs sync-key="benchmark-device">
<VTDocTab title="Oppo Find X9 Pro" value="oppo">

| Configuration                               | Input preparation (median) | Detector (median) | OCR (median) |
| ------------------------------------------- | -------------------------: | ----------------: | -----------: |
| YOLOv9-t 384, 1 thread (this branch)        |                         37 |               167 |           42 |
| YOLOv9-t 640, 1 thread                      |                         56 |               422 |           35 |
| YOLOv9-t 640, 4 threads                     |                         62 |               186 |           20 |
| YOLOv9-s 608, 4 threads                     |                         47 |               504 |           20 |
| YOLOv9-t 384, 1 thread, repeated at the end |                         37 |               156 |           38 |

</VTDocTab>
<VTDocTab title="OnePlus 6" value="oneplus-6">

| Configuration                               | Input preparation (median) | Detector (median) | OCR (median) |
| ------------------------------------------- | -------------------------: | ----------------: | -----------: |
| YOLOv9-t 384, 1 thread (this branch)        |                        136 |              2435 |          309 |
| YOLOv9-t 640, 1 thread                      |                        174 |              6527 |          300 |
| YOLOv9-t 640, 4 threads                     |                        142 |              1766 |          110 |
| YOLOv9-s 608, 4 threads                     |                        129 |              5291 |          113 |
| YOLOv9-t 384, 1 thread, repeated at the end |                        138 |              2403 |          309 |

</VTDocTab>
<VTDocTab title="PC (reference)" value="pc">

| Configuration                        | Input preparation (median) | Detector (median) | OCR (median) |
| ------------------------------------ | -------------------------: | ----------------: | -----------: |
| YOLOv9-t 384, 1 thread (this branch) |                         12 |               124 |           14 |
| YOLOv9-t 640, 1 thread               |                         30 |               334 |           15 |

</VTDocTab>
</VTDocTabs>

- **Accuracy does not depend on the device.** Both phones give the same results (69.4 / 72.2 / 72.2 / 75.0%) because the computation is deterministic. The PC gives 63.9% with the configuration of this branch against 69.4% on the phones with the same detection (88.9%); the most likely cause is that Firefox and Chrome rescale the image differently. With only 72 plates the difference is not significant (an interval of about ±10 points), so these figures are for comparing configurations with each other, not for estimating absolute accuracy: that is what the 2,547 plates of the large benchmark are for.
- **Time depends a lot on the device.** With the configuration of this branch (t-384, 1 thread) the Oppo takes 250 ms per photo (1.7 times the PC) and the OnePlus 6 takes **2,884 ms (19 times the PC)**: about 0.34 photos per second. The detector weighs the most on both, and on the OnePlus 6 the OCR as well (309 ms against 42 ms).
- **Threads pay off more than changing the model.** On the OnePlus 6, t-640 with 4 threads (2,049 ms) is **faster than this branch** (2,884 ms) and finds 95.8% of the plates against 88.9%. On the Oppo it costs a bit more (278 ms against 250 ms). With 1 thread, t-640 is 2 times slower on the Oppo and 2.4 times on the OnePlus 6.
- **s-608 does not pay off on phones.** It gains 2.8 reading points over t-640 (75.0% against 72.2%, 2 plates out of 72, within the noise) and takes 2.1 times (Oppo) and 2.7 times (OnePlus 6) longer with 4 threads.
- **No overheating in short passes.** On the OnePlus 6 the last quarter of each pass takes as long as the first (between −0.5% and +4.3%); on the Oppo the first quarter is the slowest (between −7% and −21%), which suggests the processor ramps up its frequency at the start. Passes last between 14 s (Oppo) and 6 min (OnePlus 6); the sustained test was not enabled, so heat during minutes of continuous use is still unmeasured.

<VTDocTabs sync-key="benchmark-device">
<VTDocTab title="Oppo Find X9 Pro" value="oppo">

| Configuration                               | First quarter (ms) | Last quarter (ms) | Change |
| ------------------------------------------- | -----------------: | ----------------: | -----: |
| YOLOv9-t 384, 1 thread (this branch)        |                298 |               253 | -15.0% |
| YOLOv9-t 640, 1 thread                      |                564 |               527 |  -6.6% |
| YOLOv9-t 640, 4 threads                     |                319 |               276 | -13.6% |
| YOLOv9-s 608, 4 threads                     |                637 |               570 | -10.4% |
| YOLOv9-t 384, 1 thread, repeated at the end |                274 |               216 | -21.0% |

</VTDocTab>
<VTDocTab title="OnePlus 6" value="oneplus-6">

| Configuration                               | First quarter (ms) | Last quarter (ms) | Change |
| ------------------------------------------- | -----------------: | ----------------: | -----: |
| YOLOv9-t 384, 1 thread (this branch)        |               2890 |              3013 |  +4.3% |
| YOLOv9-t 640, 1 thread                      |               7071 |              7141 |  +1.0% |
| YOLOv9-t 640, 4 threads                     |               2099 |              2089 |  -0.5% |
| YOLOv9-s 608, 4 threads                     |               5593 |              5580 |  -0.2% |
| YOLOv9-t 384, 1 thread, repeated at the end |               2865 |              2977 |  +3.9% |

</VTDocTab>
<VTDocTab title="PC (reference)" value="pc">

| Configuration                        | First quarter (ms) | Last quarter (ms) | Change |
| ------------------------------------ | -----------------: | ----------------: | -----: |
| YOLOv9-t 384, 1 thread (this branch) |                152 |               156 |  +2.7% |
| YOLOv9-t 640, 1 thread               |                382 |               386 |  +0.9% |

</VTDocTab>
</VTDocTabs>

<VTDocInfo>

**Measurement notes.** A first run on the OnePlus 6 was made while Google Play was updating apps in the background, and it was repeated. With 1 thread nothing changed (2,761 against 2,884 ms), but with 4 threads it did: t-640 went from 2,834 to 2,049 ms and s-608 from 7,264 to 5,560 ms. The numbers in the table are from the second run. Before measuring on a phone, close all other processes, because multithreading is sensitive to background load. All three devices had COOP/COEP isolation (through a service worker on the test page, since the hosting did not allow headers) and the requested threads were the effective ones.

</VTDocInfo>

<VTDocTip>

**What this means for a camera or video mode.** With t-384 and one thread, the OnePlus 6 processes one image every 3 s and the Oppo about 4 per second. For video, only the latest available frame should be processed and the rest dropped, and on low-end devices the detector would have to be smaller (t-256 and t-416 were measured in the large benchmark, but not on phones). Raising accuracy with a larger detector only makes sense if it does not lower the frames per second; multithreading is what makes t-640 possible without losing speed.

</VTDocTip>

## Environment

<VTDocAccordionGroup>
<VTDocAccordion title="Browser, COOP/COEP isolation and free CPU per variant">

| Variant                                      | Browser       | COOP/COEP isolation | Free CPU before | Governor  |
| -------------------------------------------- | ------------- | ------------------- | --------------: | --------- |
| This branch + s-608 + 4 threads              | 153.0.8010.12 | yes                 |           99.6% | powersave |
| This branch + t-640                          | 153.0.8010.12 | no                  |           97.6% | powersave |
| This branch + t-640 + 4 threads              | 153.0.8010.12 | yes                 |           99.7% | powersave |
| s-608                                        | 153.0.8010.12 | no                  |           99.3% | powersave |
| 4 threads + s-608                            | 153.0.8010.12 | yes                 |           99.6% | powersave |
| This branch                                  | 153.0.8010.12 | no                  |           97.5% | powersave |
| This branch + 4 threads                      | 153.0.8010.12 | yes                 |           99.6% | powersave |
| t-640                                        | 153.0.8010.12 | no                  |           99.4% | powersave |
| 4 threads + t-640                            | 153.0.8010.12 | yes                 |           99.6% | powersave |
| t-416                                        | 153.0.8010.12 | no                  |           98.8% | powersave |
| 2 threads                                    | 153.0.8010.12 | yes                 |           98.9% | powersave |
| 4 threads                                    | 153.0.8010.12 | yes                 |           98.7% | powersave |
| 8 threads                                    | 153.0.8010.12 | yes                 |           98.3% | powersave |
| CCT-XS v2, threshold 0.6 (repeat midway)     | 153.0.8010.12 | no                  |           99.4% | powersave |
| CCT-XS v2, threshold 0.6 (repeat at the end) | 153.0.8010.12 | no                  |           99.7% | powersave |
| CCT-XS v2, threshold 0.6, ORT 1.24.3         | 153.0.8010.12 | no                  |           98.1% | powersave |
| CCT-XS v2, threshold 0.6                     | 153.0.8010.12 | no                  |           98.6% | powersave |
| t-512                                        | 153.0.8010.12 | no                  |           99.1% | powersave |
| CCT-S v2                                     | 153.0.8010.12 | no                  |           98.8% | powersave |
| CCT-XS v1                                    | 153.0.8010.12 | no                  |           98.4% | powersave |
| v1.0.0 (MobileViT v2)                        | 153.0.8010.12 | no                  |           99.7% | powersave |
| Letterbox (t-384)                            | 153.0.8010.12 | no                  |           99.3% | powersave |
| CCT-S v1                                     | 153.0.8010.12 | no                  |           98.2% | powersave |
| t-256                                        | 153.0.8010.12 | no                  |           98.8% | powersave |

</VTDocAccordion>
</VTDocAccordionGroup>

## Limitations

- **Two sessions:** phase 1 (18 variants) and phase 2 (6 combinations, same conditions) were run separately. Phase 2 variants have no repeat of their own (the phase 1 repeats cover the drift of that session).
- **A single pass per variant** (drift between repeats is under 1%, but there are no per-variant deviations).
- **CPU governor `powersave`** (amd-pstate-epp): it could not be changed without privileges. It affects the absolute timings, not the relative comparisons within the session.
- **Desktop hardware** (Ryzen 9 5900X, 12 cores) in the large benchmark. The phone measurement ([Measurement on real phones](#measurement-on-real-phones)) covers only two Android devices and 50 photos (72 plates): it is good for comparing configurations and estimating timings, not absolute accuracy, and there are no mid-range devices or iOS.
- **Partial ground truth** (2 hidden characters per plate) and the repeated-letter artifact.
- **A single dataset** of Spanish plates, mostly daytime and high-resolution photos. There is no measurement with live video or camera, nor the sustained heat test on a phone.
- **Unknown training contamination:** it is not known whether the detectors or OCR models saw images of this dataset.
- "Detections without an annotated plate" overestimates false positives, because some background plates are not annotated.

<VTDocWarning>

Multithreading requires `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`, and serving the ORT glue files separately with `ort.env.wasm.wasmPaths`. Check that your hosting allows it.

</VTDocWarning>

## Recommendations and status

<VTDocCheck>

**Applied** in branch `feature/ocr-cct-v2`:

1. **CCT-XS v2 OCR** and onnxruntime-web 1.30 (`60c8d83`), instead of the previous OCR and of CCT-S v2 (which was used first). The old model and configuration were removed. +5.7 points measured.
2. **Detector threshold 0.25** (`a0d2d60`). +4.0 points measured.
3. **O/Q→0 and I→1 correction** in the numeric block of Spanish plates (4 digits + 3 consonants, `80fa22e`). It only applies to 7-character readings, so it never acts on this dataset, where the grey boxes leave readings of 5 or 6 characters, and its effect could not be measured. A broader offline correction (any position) would add 4.2 points.
4. **Rejection of plates cut by the frame edge** (`407e88d`) in the plate validation. It decides which plates reach the history and was not simulated.

</VTDocCheck>

<VTDocInfo>

**Still to decide:**

5. **Multithreading with this detector** (4 threads): 56 ms against 156 ms on the desktop with exactly the same readings. It needs `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`; without them the app stays on one thread. It was not measured on phones with t-384 (only with t-640, where it went from 7.0 to 2.0 s on the OnePlus 6).
6. **Larger detector, only per device** ([Why this branch keeps the t-384 detector](#why-this-branch-keeps-the-t-384-detector)): t-640 with 4 threads gives 78.4% at 134 ms on the desktop and is faster than this branch on the OnePlus 6 (2,049 against 2,884 ms), with 7 more points of plates found; s-608 gives 81.6% at 287 ms, but does not pay off on phones. Before using them: measure the target devices (low-end and rugged handhelds), battery and heat under continuous use, and video/camera behaviour.
7. Do not show the region that CCT predicts.

</VTDocInfo>

## Reproducibility

The benchmark lives outside this repository. It has a script that builds every variant from the app (`git archive` plus patches), a runner that loads the models once per variant in a fresh Chromium and times the app's real Web Worker, and an analysis script that scores the results against the dataset's ground truth and generates the tables and charts on this page. Raw results are stored per variant as JSON, with the environment of each run.

## Citation and attributions

**UC3M-LP dataset** (license [ODbL-1.0](https://opendatacommons.org/licenses/odbl/1-0/)): [repository](https://github.com/ramajoballester/UC3M-LP) · download: [DOI 10.21950/OS5W4Z](https://doi.org/10.21950/OS5W4Z) · [Zenodo](https://zenodo.org/records/17152029)

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
