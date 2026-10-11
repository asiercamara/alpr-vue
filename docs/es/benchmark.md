---
title: 'Benchmark: elección de OCR, detector y runtime'
description: 'Cómo se compararon el modelo OCR, el detector de matrículas y el runtime ONNX de ALPR Vue con 1975 fotos reales con ground truth: métodos, resultados, limitaciones y recomendaciones.'
---

Esta página documenta el benchmark detrás de las decisiones de modelos de ALPR Vue: qué modelo OCR (reconocimiento óptico de caracteres), qué detector de matrículas, qué umbral de detección y qué configuración de ONNX Runtime Web. Recoge qué se probó, cómo, los resultados completos y las recomendaciones. Los resultados son del 2026-10-11 y comparan la rama `feature/ocr-cct-v2` con `develop` (ef429b1).

<VTDocNote>

**Atribución del dataset.** Todas las medidas de esta página se han hecho con el dataset **UC3M-LP**, de Álvaro Ramajo-Ballester, José María Armingol Moreno y Arturo de la Escalera Hueso (Universidad Carlos III de Madrid), publicado bajo licencia [ODbL-1.0](https://opendatacommons.org/licenses/odbl/1-0/):

- Repositorio: [ramajoballester/UC3M-LP](https://github.com/ramajoballester/UC3M-LP) en GitHub
- Descarga: [DOI 10.21950/OS5W4Z](https://doi.org/10.21950/OS5W4Z) (alternativa: [Zenodo](https://zenodo.org/records/17152029))
- Artículo (acceso abierto): [DOI 10.1016/j.robot.2023.104608](https://doi.org/10.1016/j.robot.2023.104608)

El dataset no se redistribuye ni se incluye en esta página; las imágenes se usaron solo para evaluar. Si se reutilizan estos resultados, hay que citar el artículo (referencia completa en [Cita y atribuciones](#cita-y-atribuciones)).

</VTDocNote>

Todas las tablas se generan automáticamente a partir de los resultados en bruto del benchmark. Los scripts del benchmark no forman parte de este repositorio.

## Resumen ejecutivo

- **Esta rama frente a la v1.0.0.** El setup de la rama `feature/ocr-cct-v2` (OCR CCT-XS v2, onnxruntime-web 1.30 y umbral del detector 0,25) lee sin error el **74,8 %** de las 2547 matrículas del dataset frente al **65,2 %** de la v1.0.0 publicada, casi con el mismo tiempo (156 ms frente a 149 ms por imagen). La diferencia es significativa (McNemar, p<0,001). [De la v1.0.0 a esta rama](#de-la-v1-0-0-a-esta-rama) reparte la mejora por cambio.
- **OCR: CCT-XS v2 global.** Con el detector de la v1.0.0 lee el 70,9 % de las matrículas frente al 65,2 % del OCR viejo (MobileViT v2 europeo), con el mismo tiempo (154 ms frente a 149 ms). CCT-S v2 es un 54 % más lento (237 ms) y acierta menos (68,4 %), así que no compensa.
- **El OCR viejo no carga con onnxruntime-web 1.30** (error de inferencia de formas), de modo que el cambio de runtime y el de OCR van juntos. Entre 1.24.3 y 1.30.0 no hay diferencia de velocidad ni de resultados con el mismo modelo.
- **La mayor palanca que queda está en el detector**, no en el OCR. Con el setup de la v1.0.0 (YOLOv9-t a 384 px, umbral 0,6) el detector solo encuentra el 83,7 % de las matrículas; con el umbral 0,25 de esta rama encuentra el 89,0 %, sin coste de tiempo. Subir la resolución a 640 px sobre esta rama da **78,4 %** (+3,6 puntos, 392 ms).
- **El WASM multihilo** (4 hilos) divide el tiempo por unos 2,8 (156 → 56 ms con esta rama) sin cambiar ningún resultado, a cambio de unas 2 veces más CPU total y de servir la app con cabeceras COOP/COEP.
- **En móviles reales** (Oppo Find X9 Pro y OnePlus 6, 50 fotos del dataset) el multihilo es lo que hace viable el detector mayor: YOLOv9-t 640 con 4 hilos encuentra el 95,8 % de las matrículas (88,9 % esta rama) y tarda 278 ms en el Oppo (250 ms esta rama) y 2049 ms en el OnePlus 6 (2884 ms esta rama). El OnePlus 6, de 2018, procesa solo 0,34 fotos por segundo con esta rama, un dato clave para un modo cámara o vídeo ([Medición en móviles reales](#medicion-en-moviles-reales)).
- **Hay más acierto disponible, pero esta rama todavía no lo usa.** En escritorio, esta rama + YOLOv9-t 640 + 4 hilos llega al 78,4 % en 134 ms por imagen, y YOLOv9-s 608 al 81,6 % en 287 ms. Los dos dependen del multihilo y de un hardware que este benchmark no ha cubierto, como los terminales robustos que usan las empresas, así que esta rama mantiene el detector t-384 ([por qué](#por-que-esta-rama-mantiene-el-detector-t-384)).
- **Descartado:** letterbox en el detector (empeora 6 puntos), YOLOv9-t 256 (58,2 %) y CCT-S v1 (61,3 %, el peor y el más lento de los OCR).

### De la v1.0.0 a esta rama

| Cambio (commit)                                                               | Leídas OK (de todas) | Cambio frente a la fila anterior | ms/img |
| ----------------------------------------------------------------------------- | -------------------: | -------------------------------: | -----: |
| v1.0.0: OCR MobileViT v2, ORT 1.24.3, YOLOv9-t 384, umbral 0,6                |               65,2 % |                                — |    149 |
| OCR CCT-XS v2 y onnxruntime-web 1.30 (`60c8d83`)                              |               70,9 % |                          +5,7 pp |    154 |
| Umbral del detector 0,6 → 0,25 (`a0d2d60`): **esta rama**                     |               74,8 % |                          +4,0 pp |    156 |
| Corrección de O/Q/I en el bloque numérico de matrículas españolas (`80fa22e`) |               74,8 % |        sin efecto en estos datos |      — |
| Descarte de matrículas cortadas por el borde (`407e88d`)                      |                    — |            no medido (historial) |      — |

La corrección de O/Q/I solo actúa sobre lecturas de 7 caracteres con la forma de una matrícula española actual (4 dígitos + 3 consonantes). En este dataset cada matrícula tiene 2 caracteres tapados, así que las lecturas tienen 5 o 6 caracteres y la regla nunca se aplica (0 de las 2445 lecturas de esta rama); con matrículas reales sí. El descarte por el borde decide qué matrículas llegan al historial, que el benchmark no simula. Por eso, en todas las tablas, **Esta rama** lee exactamente como la rama.

### Recomendación

<VTDocCardGroup cols="3">
<VTDocCard title="Esta rama (aplicada)">

**74,8 %** leídas OK · **156&nbsp;ms** por imagen

CCT-XS v2 + umbral 0,25 con el detector YOLOv9-t 384. Funciona en un hilo, sin cabeceras especiales.

</VTDocCard>
<VTDocCard title="Siguiente paso: 4 hilos">

**74,8 %** leídas OK · **56&nbsp;ms** por imagen

Esta rama con WASM multihilo: las mismas lecturas, más rápido. Necesita COOP/COEP; sin ellas sigue en un hilo, como hoy.

</VTDocCard>
<VTDocCard title="Solo para dispositivos rápidos">

**78,4 %** leídas OK · **134&nbsp;ms** por imagen

Esta rama + YOLOv9-t 640 + 4 hilos. Descartada por ahora (ver más abajo).

</VTDocCard>
</VTDocCardGroup>

<VTDocCheck>

**Ya aplicado en la rama `feature/ocr-cct-v2`:** CCT-XS v2 con el OCR viejo eliminado, umbral del detector 0,25, corrección de O/Q/I en matrículas españolas y descarte de matrículas cortadas por el borde ([Recomendaciones y estado](#recomendaciones-y-estado)). El siguiente paso es el multihilo; un detector mayor no está previsto por ahora.

</VTDocCheck>

### Por qué esta rama mantiene el detector t-384

Los detectores mayores aciertan más en este dataset, pero esta rama mantiene YOLOv9-t 384 porque la app tiene que funcionar en móviles y terminales modestos, donde esa mejora no está garantizada y el coste puede ser mayor que hoy:

- **El hardware de gama baja no se ha medido.** El dispositivo más lento medido, un OnePlus 6 (Snapdragon 845, 2018), ya tarda 2,9 s por foto con esta rama. Los terminales robustos y los móviles de gama baja que usan las empresas suelen tener procesadores más antiguos y más lentos.
- **t-640 solo compensa con multihilo.** Con 4 hilos es más rápido que esta rama en el OnePlus 6 (2,0 s frente a 2,9 s), pero el multihilo exige aislamiento COOP/COEP, que un WebView o un navegador gestionado en modo quiosco pueden no ofrecer. En un hilo, t-640 es 2,4 veces más lento (7,0 s en el OnePlus 6).
- **Más CPU, batería y descarga.** El multihilo duplica el tiempo de CPU por imagen, y el calor con uso continuo no se ha medido. El modelo t-640 pesa 15,6 MB frente a 7,8 MB, y s-608, 36,4 MB.
- **Este dataset exagera las matrículas pequeñas.** En sus fotos de hasta 64 MP la matrícula mediana mide 34 px de ancho en la entrada del detector, y ahí es donde gana t-640. Con un lector de mano el operario apunta a la matrícula, que ocupa más parte del encuadre: a partir de 24 px de ancho esta rama ya encuentra el 97–98 % de las matrículas.

El multihilo con el mismo detector no tiene ninguno de estos inconvenientes: las lecturas no cambian y, sin aislamiento, la app sigue funcionando en un hilo como ahora. Un detector mayor solo tendría sentido elegido según el dispositivo (por ejemplo, midiendo unas pocas inferencias al arrancar) y después de medir el hardware objetivo.

## Qué se ha probado

### Punto de partida y modelos

- **App de partida** (`develop`, ef429b1, el mismo código de la app que la versión publicada **v1.0.0**): detector YOLOv9-t a 384 px (umbral 0,6), OCR europeo MobileViT v2, onnxruntime-web 1.24.3, inferencia WASM en un hilo, imagen estirada a cuadrado para el detector.
- **Fuente de los modelos:** detector y OCR de [open-image-models](https://github.com/ankandrew/open-image-models) y [fast-plate-ocr](https://github.com/ankandrew/fast-plate-ocr) (ankandrew, MIT), que son también los que usa la app.
- **OCR CCT** (_Compact Convolutional Transformer_): tamaños XS y S, versiones v1 y v2. Los v2 añaden una cabeza que predice el país de la matrícula. Entrada de 128×64 RGB, alfabeto de 36 caracteres más relleno, 10 posiciones.
- **Detectores YOLOv9** exportados con NMS incluido («end2end»): t-256, t-384 (el actual), t-416, t-512, t-640 y s-608.

### Variantes medidas

En total 24 variantes en dos fases, cada una con la app real compilada con los cambios indicados. Salvo que se indique otra cosa, cada variante cambia una sola cosa sobre **CCT-XS v2, umbral 0,6**: la v1.0.0 con solo el OCR cambiado (CCT-XS v2, ORT 1.30.0, detector t-384, umbral 0,6), de modo que el efecto de cada cambio se mide por separado. Las variantes que se llaman **Esta rama** usan umbral 0,25, como la rama.

| Etiqueta                                                                                                        | Qué cambia                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| CCT-XS v2, umbral 0,6                                                                                           | La v1.0.0 con el OCR CCT-XS v2 y ORT 1.30.0 (detector t-384, umbral 0,6): la base de las variantes de un solo cambio                         |
| CCT-XS v2, umbral 0,6 (repetición a mitad), CCT-XS v2, umbral 0,6 (repetición al final)                         | Repetida a mitad y al final de la fase 1 (deriva de la sesión)                                                                               |
| v1.0.0 (MobileViT v2)                                                                                           | La app publicada v1.0.0: OCR europeo MobileViT v2 con ORT 1.24.3                                                                             |
| CCT-XS v1, CCT-S v1, CCT-S v2                                                                                   | Otros OCR CCT                                                                                                                                |
| CCT-XS v2, umbral 0,6, ORT 1.24.3                                                                               | CCT-XS v2 con onnxruntime-web 1.24.3 (efecto del runtime)                                                                                    |
| 2 hilos, 4 hilos, 8 hilos                                                                                       | WASM multihilo con 2, 4 (automático) y 8 hilos                                                                                               |
| t-256, t-416, t-512, t-640                                                                                      | Detector YOLOv9-t a otras resoluciones                                                                                                       |
| s-608                                                                                                           | Detector YOLOv9-s a 608 px                                                                                                                   |
| Letterbox (t-384)                                                                                               | Letterbox en lugar de estirar la imagen                                                                                                      |
| **Esta rama**                                                                                                   | CCT-XS v2 con umbral de confianza del detector 0,25 en lugar de 0,6: el setup de la rama `feature/ocr-cct-v2` y la referencia de esta página |
| Esta rama + t-640                                                                                               | Esta rama con el detector t-640                                                                                                              |
| 4 hilos + t-640, 4 hilos + s-608, Esta rama + 4 hilos, Esta rama + t-640 + 4 hilos, Esta rama + s-608 + 4 hilos | Las mismas combinaciones con 4 hilos                                                                                                         |

Se descartaron sin medir: el OCR global MobileViT v2 (no carga con ORT 1.30) y el letterbox con detectores mayores (letterbox + t-512, + t-640 y + s-608), porque el letterbox ya empeoraba 6 puntos con el detector actual ([Detector](#detector)).

## Qué se ha medido y cómo

### Dataset

UC3M-LP (Ramajo-Ballester et al., _Robotics and Autonomous Systems_ 172, 2024; licencia ODbL-1.0): fotos reales de coches con matrículas españolas, con anotación de polígono y de caracteres. Se usan las dos particiones (train y test), porque se necesitaba volumen y los modelos evaluados no se entrenaron con este dataset hasta donde se sabe (no está verificado, ver [Limitaciones](#limitaciones)).

| Dato                                          | Valor                                                                                                                                          |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Imágenes                                      | 1975                                                                                                                                           |
| Matrículas                                    | 2547                                                                                                                                           |
| Resoluciones                                  | 5184×3888 (822), 6960×4640 (820), 9248×6944 (162), 2048×1536 (77), 2016×4480 (46), 4480×2016 (36), 6944×9248 (6), 1536×2048 (5), 4624×3472 (1) |
| Tipo de matrícula                             | A: 2498, D: 11, B: 31, E: 6, C: 1                                                                                                              |
| Iluminación                                   | noche: 362, día: 2185                                                                                                                          |
| Ancho de la matrícula en la entrada de 384 px | p10 15 px · mediana 34 px · p90 73 px                                                                                                          |

Detalles que condicionan la interpretación:

- Cada matrícula tiene **2 caracteres tapados con una caja gris** (aparecen como `*` en la anotación). El ground truth es parcial: se acepta cualquier carácter en esas posiciones y no se penaliza no leerlos.
- Esas cajas grises hacen que los modelos a veces **repitan la letra vecina** (`614BMM` en lugar de `614BM`). Es un artefacto del dataset, no un fallo real del modelo ([Artefacto de las cajas grises](#artefacto-de-las-cajas-grises)).
- La mayoría de fotos son de día (2185 matrículas frente a 362 de noche) y son muy grandes (hasta 9248×6944), de modo que en la entrada de 384 px del detector la matrícula mediana mide solo 34 px de ancho: es un test duro para el detector.
- Solo se anotan las matrículas principales. Parte de las «detecciones sin matrícula anotada» son matrículas reales de fondo.

### Métricas

- **Encontradas:** matrículas reales con una detección de IoU ≥ 0,5 (también se da IoU ≥ 0,3 en [Detector](#detector)).
- **Leídas OK (de las encontradas):** calidad del OCR, con una lectura sin ningún error de edición respecto a la plantilla (con comodines).
- **Leídas OK (de todas):** métrica de extremo a extremo y la principal de esta página; combina detector y OCR. Intervalos de confianza de Wilson al 95 %.
- **Referencia: Esta rama**, el setup de la rama `feature/ocr-cct-v2` (CCT-XS v2, ORT 1.30.0, detector t-384, umbral 0,25). Todas las Δ se miden contra ella. **v1.0.0 (MobileViT v2)** es la app publicada, y **CCT-XS v2, umbral 0,6** es el paso intermedio con solo el OCR cambiado.
- **McNemar exacto** frente a esta rama, sobre las mismas matrículas.
- **ms/img:** tiempo de `postMessage` a respuesta del worker real de la app, mediana sobre las 1975 imágenes (la decodificación de la imagen se mide aparte y se excluye).

### Banco de pruebas

- La app real compilada por variante (`git archive` + parches), servida en local y ejecutada en Chromium (Playwright). Se mide el `Worker` verdadero de la app.
- **Modelos cargados una sola vez** por variante, 5 imágenes de calentamiento descartadas y una pasada completa de 1975 imágenes. Un Chromium nuevo por variante.
- **Una variante a la vez**, esperando CPU libre (≥97 %) antes de empezar y sin usar la máquina durante la ejecución.
- No se guardan recortes: la solución correcta ya está en el dataset.
- La variante CCT-XS v2, umbral 0,6 se repitió al principio, a mitad y al final de la sesión para medir la deriva ([Deriva de la sesión](#deriva-de-la-sesion)).

| Elemento          | Valor                                                   |
| ----------------- | ------------------------------------------------------- |
| CPU               | AMD Ryzen 9 5900X 12-Core Processor (24 hilos)          |
| RAM               | 63 GB                                                   |
| Sistema           | CachyOS, Linux 7.2.9-2-cachyos                          |
| Gobernador de CPU | powersave (amd-pstate-epp, preferencia power)           |
| Node / Playwright | v22.22.2 / 1.63.0                                       |
| Navegador         | 153.0.8010.12 (Chromium, headless nuevo)                |
| Código de la app  | feature/ocr-cct-v2 @ e993f87; v1.0.0: develop @ ef429b1 |
| onnxruntime-web   | 1.30.0 y 1.24.3                                         |

## Resultados globales

<VTDocFrame src="/benchmark/accuracy-ci.svg" alt="Gráfico de puntos del porcentaje de matrículas leídas sin error por variante, con intervalos de confianza del 95 % y una línea en esta rama (74,8 %)." caption="Matrículas leídas sin error, con el intervalo de confianza del 95 %. Se omiten las variantes que solo cambian la velocidad (hilos, versión de ORT, repeticiones), porque dan el mismo resultado que su versión de un hilo. Un punto hueco no difiere de forma significativa de esta rama." />

| Variante                                    | ms/img (mediana) |     p95 | Encontradas | Leídas OK (de las encontradas) | Leídas OK (de todas) | Δ vs esta rama | p (McNemar) |
| ------------------------------------------- | ---------------: | ------: | ----------: | -----------------------------: | -------------------: | -------------: | ----------: |
| Esta rama + s-608 + 4 hilos                 |           287 ms |  300 ms |       96,9% |                          84,2% |  81,6% (80,0%–83,0%) |        +6,8 pp |      <0,001 |
| Esta rama + t-640                           |           392 ms |  421 ms |       94,5% |                          83,0% |  78,4% (76,8%–80,0%) |        +3,6 pp |      <0,001 |
| Esta rama + t-640 + 4 hilos                 |           134 ms |  145 ms |       94,5% |                          83,0% |  78,4% (76,8%–80,0%) |        +3,6 pp |      <0,001 |
| s-608                                       |          1039 ms | 1061 ms |       92,2% |                          84,9% |  78,3% (76,7%–79,9%) |        +3,5 pp |      <0,001 |
| 4 hilos + s-608                             |           289 ms |  300 ms |       92,2% |                          84,9% |  78,3% (76,7%–79,9%) |        +3,5 pp |      <0,001 |
| **Esta rama**                               |           156 ms |  176 ms |       89,0% |                          84,0% |  74,8% (73,1%–76,5%) |              — |           — |
| Esta rama + 4 hilos                         |            56 ms |   66 ms |       89,0% |                          84,0% |  74,8% (73,1%–76,5%) |        +0,0 pp |       1,000 |
| t-640                                       |           393 ms |  416 ms |       88,7% |                          83,9% |  74,4% (72,6%–76,0%) |        -0,5 pp |       0,591 |
| 4 hilos + t-640                             |           132 ms |  143 ms |       88,7% |                          83,9% |  74,4% (72,6%–76,0%) |        -0,5 pp |       0,591 |
| t-416                                       |           182 ms |  201 ms |       84,4% |                          84,2% |  71,0% (69,2%–72,8%) |        -3,8 pp |      <0,001 |
| 2 hilos                                     |            88 ms |  101 ms |       83,7% |                          84,7% |  70,9% (69,1%–72,6%) |        -4,0 pp |      <0,001 |
| 4 hilos                                     |            56 ms |   65 ms |       83,7% |                          84,7% |  70,9% (69,1%–72,6%) |        -4,0 pp |      <0,001 |
| 8 hilos                                     |            47 ms |   57 ms |       83,7% |                          84,7% |  70,9% (69,1%–72,6%) |        -4,0 pp |      <0,001 |
| CCT-XS v2, umbral 0,6 (repetición a mitad)  |           153 ms |  171 ms |       83,7% |                          84,7% |  70,9% (69,1%–72,6%) |        -4,0 pp |      <0,001 |
| CCT-XS v2, umbral 0,6 (repetición al final) |           154 ms |  171 ms |       83,7% |                          84,7% |  70,9% (69,1%–72,6%) |        -4,0 pp |      <0,001 |
| CCT-XS v2, umbral 0,6, ORT 1.24.3           |           152 ms |  170 ms |       83,7% |                          84,7% |  70,9% (69,1%–72,6%) |        -4,0 pp |      <0,001 |
| CCT-XS v2, umbral 0,6                       |           154 ms |  172 ms |       83,7% |                          84,7% |  70,9% (69,1%–72,6%) |        -4,0 pp |      <0,001 |
| t-512                                       |           266 ms |  285 ms |       82,3% |                          84,2% |  69,3% (67,5%–71,1%) |        -5,5 pp |      <0,001 |
| CCT-S v2                                    |           237 ms |  337 ms |       83,7% |                          81,7% |  68,4% (66,6%–70,2%) |        -6,4 pp |      <0,001 |
| CCT-XS v1                                   |           152 ms |  168 ms |       83,7% |                          81,3% |  68,0% (66,2%–69,8%) |        -6,8 pp |      <0,001 |
| v1.0.0 (MobileViT v2)                       |           149 ms |  165 ms |       83,7% |                          77,9% |  65,2% (63,3%–67,0%) |        -9,7 pp |      <0,001 |
| Letterbox (t-384)                           |           153 ms |  169 ms |       77,7% |                          83,5% |  64,9% (63,0%–66,7%) |       -10,0 pp |      <0,001 |
| CCT-S v1                                    |           312 ms |  488 ms |       83,7% |                          73,3% |  61,3% (59,4%–63,2%) |       -13,5 pp |      <0,001 |
| t-256                                       |            79 ms |   95 ms |       69,7% |                          83,4% |  58,2% (56,3%–60,1%) |       -16,6 pp |      <0,001 |

Por qué hay varias filas idénticas en acierto: las filas «2 hilos», «4 hilos», «8 hilos» y «CCT-XS v2, umbral 0,6, ORT 1.24.3» solo cambian la velocidad o el runtime y producen **exactamente las mismas lecturas** que CCT-XS v2, umbral 0,6, y «Esta rama + 4 hilos» lee exactamente como esta rama; sirven de comprobación de que el multihilo y el cambio de versión de ORT no alteran el resultado. Las variantes de un solo cambio (t-640, s-608, los otros OCR…) mantienen el umbral 0,6, así que su Δ frente a esta rama incluye los 4 puntos que cuesta ese umbral.

<VTDocFrame src="/benchmark/speed-vs-accuracy.svg" alt="Gráfico de dispersión del tiempo mediano por imagen (escala logarítmica) frente al porcentaje de matrículas leídas sin error, para cada variante." caption="Velocidad frente a acierto, por variante. Los puntos huecos usan un hilo y los rellenos, multihilo. La línea discontinua une las variantes que ninguna otra supera a la vez en velocidad y acierto." />

## Detector

| Variante                                    | Recall IoU ≥ 0,5 (IC 95 %) | Recall IoU ≥ 0,3 | Detecciones sin matrícula anotada | recall <16 px | recall 16–24 | recall 24–32 | recall 32–48 | recall ≥48 |
| ------------------------------------------- | -------------------------: | ---------------: | --------------------------------: | ------------: | -----------: | -----------: | -----------: | ---------: |
| Esta rama + s-608 + 4 hilos                 |        96,9% (96,2%–97,5%) |            97,4% |                               265 |           82% |          97% |          99% |         100% |       100% |
| Esta rama + t-640                           |        94,5% (93,5%–95,3%) |            95,6% |                               220 |           78% |          96% |          97% |          98% |        95% |
| Esta rama + t-640 + 4 hilos                 |        94,5% (93,5%–95,3%) |            95,6% |                               220 |           78% |          96% |          97% |          98% |        95% |
| s-608                                       |        92,2% (91,1%–93,2%) |            92,5% |                               105 |           50% |          95% |          98% |          99% |        99% |
| 4 hilos + s-608                             |        92,2% (91,1%–93,2%) |            92,5% |                               105 |           50% |          95% |          98% |          99% |        99% |
| Esta rama                                   |        89,0% (87,8%–90,2%) |            90,5% |                               141 |           35% |          90% |          97% |          98% |        98% |
| Esta rama + 4 hilos                         |        89,0% (87,8%–90,2%) |            90,5% |                               141 |           35% |          90% |          97% |          98% |        98% |
| t-640                                       |        88,7% (87,4%–89,8%) |            89,3% |                                83 |           47% |          93% |          96% |          96% |        92% |
| 4 hilos + t-640                             |        88,7% (87,4%–89,8%) |            89,3% |                                83 |           47% |          93% |          96% |          96% |        92% |
| t-416                                       |        84,4% (82,9%–85,7%) |            85,7% |                                92 |           25% |          85% |          95% |          96% |        90% |
| 2 hilos                                     |        83,7% (82,2%–85,1%) |            84,4% |                                60 |           16% |          80% |          95% |          97% |        96% |
| 4 hilos                                     |        83,7% (82,2%–85,1%) |            84,4% |                                60 |           16% |          80% |          95% |          97% |        96% |
| 8 hilos                                     |        83,7% (82,2%–85,1%) |            84,4% |                                60 |           16% |          80% |          95% |          97% |        96% |
| CCT-XS v2, umbral 0,6 (repetición a mitad)  |        83,7% (82,2%–85,1%) |            84,4% |                                60 |           16% |          80% |          95% |          97% |        96% |
| CCT-XS v2, umbral 0,6 (repetición al final) |        83,7% (82,2%–85,1%) |            84,4% |                                60 |           16% |          80% |          95% |          97% |        96% |
| CCT-XS v2, umbral 0,6                       |        83,7% (82,2%–85,1%) |            84,4% |                                60 |           16% |          80% |          95% |          97% |        96% |
| t-512                                       |        82,3% (80,8%–83,8%) |            82,8% |                                70 |           24% |          84% |          91% |          94% |        90% |
| Letterbox (t-384)                           |        77,7% (76,0%–79,3%) |            78,0% |                                56 |            7% |          56% |          90% |          96% |        97% |
| t-256                                       |        69,7% (67,9%–71,5%) |            70,7% |                                30 |            2% |          36% |          78% |          93% |        92% |

<VTDocFrame src="/benchmark/recall-by-size.svg" alt="Dos gráficos de líneas del porcentaje de matrículas encontradas según su ancho en la entrada de 384 px: uno compara tamaños de detector y el otro el umbral y el letterbox." caption="Matrículas encontradas (IoU ≥ 0,5) según su ancho en la entrada de 384 px. Izquierda: tamaño de entrada del detector. Derecha: umbral de detección y letterbox. La línea gris es el detector de la v1.0.0 (t-384, umbral 0,6) en los dos." />

Lectura:

- El detector de la v1.0.0 (t-384, umbral 0,6) deja pasar el 16,3 % de las matrículas. Fallan sobre todo las pequeñas: con menos de 16 px de ancho en la entrada solo encuentra el 16 %, entre 16 y 24 px el 80 %. Con el umbral de esta rama (0,25) deja pasar el 11,0 % y encuentra el 35 % y el 90 % de esas matrículas pequeñas.
- **Resolución:** a más resolución, más recall en matrículas pequeñas (t-640: 47 % en las de <16 px), pero no es monótono: **t-512 (82,3 %) es peor que t-384 (83,7 %)**, y en matrículas grandes (≥48 px) t-416/t-512/t-640 pierden respecto a t-384 (90–92 % frente a 96 %). Cada modelo YOLO exportado a otro tamaño se comporta distinto, así que el tamaño hay que decidirlo midiendo, no por interpolación.
- **Umbral 0,25 (esta rama):** es gratis en tiempo. Sube el recall sobre cualquier detector (+5,3 pp con t-384, +5,8 pp con t-640, +4,7 pp con s-608) a costa de más detecciones sin matrícula anotada (141 en lugar de 60 con t-384). Los filtros de calidad y confianza de la app deberían descartar parte de ellas; no se ha medido cuántas.
- **YOLOv9-s 608** es el mejor detector medido (92,2 % con umbral 0,6; 96,9 % con 0,25), pero tiene un modelo de 36,4 MB frente a 7,8 MB y cuesta 1039 ms/imagen en un solo hilo (289 ms con 4 hilos).
- **Letterbox** (mantener la proporción en lugar de estirar la imagen a cuadrado) empeora mucho (77,7 %): las fotos son 4:3 y el letterbox reduce la matrícula un 25 %. La app estira la imagen y el modelo funciona bien así.

### Barrido del umbral de confianza

Los barridos se calculan filtrando las detecciones de la ejecución con umbral 0,25.

<VTDocTabs>
<VTDocTab title="t-384 (esta rama)">

| Umbral del detector | Recall IoU ≥ 0,5 | Detecciones sin matrícula anotada | Leídas OK (de todas) |
| ------------------- | ---------------: | --------------------------------: | -------------------: |
| 0,25                |            89,0% |                               141 |                74,8% |
| 0,3                 |            88,5% |                               119 |                74,4% |
| 0,4                 |            87,5% |                                94 |                73,6% |
| 0,5                 |            85,9% |                                77 |                72,4% |
| 0,6                 |            83,7% |                                60 |                70,9% |
| 0,7                 |            79,7% |                                37 |                67,7% |

</VTDocTab>
<VTDocTab title="t-640">

| Umbral del detector | Recall IoU ≥ 0,5 | Detecciones sin matrícula anotada | Leídas OK (de todas) |
| ------------------- | ---------------: | --------------------------------: | -------------------: |
| 0,25                |            94,5% |                               220 |                78,4% |
| 0,3                 |            93,7% |                               192 |                77,8% |
| 0,4                 |            92,5% |                               144 |                76,9% |
| 0,5                 |            90,8% |                               109 |                75,8% |
| 0,6                 |            88,7% |                                83 |                74,4% |
| 0,7                 |            84,1% |                                53 |                71,1% |

</VTDocTab>
<VTDocTab title="s-608 + 4 hilos">

| Umbral del detector | Recall IoU ≥ 0,5 | Detecciones sin matrícula anotada | Leídas OK (de todas) |
| ------------------- | ---------------: | --------------------------------: | -------------------: |
| 0,25                |            96,9% |                               265 |                81,6% |
| 0,3                 |            96,5% |                               233 |                81,2% |
| 0,4                 |            95,5% |                               180 |                80,7% |
| 0,5                 |            94,4% |                               138 |                79,9% |
| 0,6                 |            92,2% |                               105 |                78,3% |
| 0,7                 |            89,0% |                                74 |                76,2% |

</VTDocTab>
</VTDocTabs>

El umbral de la v1.0.0 (0,6) es muy conservador: bajarlo a 0,25, como hace esta rama, mejora de forma continua el resultado final; el coste son más detecciones sin matrícula anotada (de 60 a 141 con t-384).

## OCR

Los OCR se comparan con el detector de la v1.0.0 (t-384, umbral 0,6), para que solo cambie el OCR.

| OCR                               | Leídas OK (de las encontradas, IC 95 %) | Errores por carácter visible | Confianza media | ms/img |
| --------------------------------- | --------------------------------------: | ---------------------------: | --------------: | -----: |
| CCT-XS v2, umbral 0,6, ORT 1.24.3 |                     84,7% (83,1%–86,1%) |                        0.035 |           95,6% | 152 ms |
| CCT-XS v2                         |                     84,7% (83,1%–86,1%) |                        0.035 |           95,6% | 154 ms |
| CCT-S v2                          |                     81,7% (80,0%–83,3%) |                        0.042 |           94,4% | 237 ms |
| CCT-XS v1                         |                     81,3% (79,6%–82,9%) |                        0.042 |           93,8% | 152 ms |
| v1.0.0 (MobileViT v2)             |                     77,9% (76,0%–79,6%) |                        0.057 |           71,1% | 149 ms |
| CCT-S v1                          |                     73,3% (71,3%–75,1%) |                        0.063 |           91,6% | 312 ms |

- **CCT-XS v2** es el mejor y está a la par de velocidad con el viejo. **CCT-S v2** no mejora (81,7 % frente a 84,7 % de las encontradas) y es un 54 % más lento. La versión v1 de ambos es peor que la v2.
- **Errores por carácter visible:** 0,035 (XS v2) frente a 0,057 (viejo): un 39 % menos.
- **Confianza:** la del OCR viejo es baja y poco discriminante (media 71 %, nada por encima de 0,9); la de los CCT está mucho mejor calibrada: cuando CCT-XS v2 dice más de 0,9 acierta el 89 %.

| OCR                   | conf 0–0.5 (n · acierto) | conf 0.5–0.7 (n · acierto) | conf 0.7–0.9 (n · acierto) | conf 0.9–1 (n · acierto) |
| --------------------- | -----------------------: | -------------------------: | -------------------------: | -----------------------: |
| v1.0.0 (MobileViT v2) |                 90 · 16% |                  725 · 65% |                 1317 · 89% |                    0 · – |
| CCT-XS v1             |                  9 · 11% |                   26 · 15% |                  464 · 67% |               1633 · 87% |
| CCT-S v1              |                   5 · 0% |                   30 · 10% |                  779 · 53% |               1318 · 87% |
| CCT-S v2              |                  11 · 9% |                   38 · 18% |                  386 · 63% |               1697 · 88% |
| CCT-XS v2             |                  8 · 13% |                   15 · 40% |                  326 · 67% |               1783 · 89% |

### Efecto en el historial de la app

Simulación de los filtros de la app (confianza media ≥ umbral y puntuación de calidad ≥ 0,7): qué matrículas llegarían al historial y cuántas serían correctas.

| Variante              | Umbral | Llegan al historial | Precisión del historial | Matrículas correctas en el historial (de todas) |
| --------------------- | -----: | ------------------: | ----------------------: | ----------------------------------------------: |
| v1.0.0 (MobileViT v2) |    0,5 |                1342 |                   88,7% |                                           46,7% |
| v1.0.0 (MobileViT v2) |    0,7 |                1327 |                   88,6% |                                           46,2% |
| v1.0.0 (MobileViT v2) |    0,9 |                   0 |                    0,0% |                                            0,0% |
| CCT-XS v1             |    0,5 |                2103 |                   82,1% |                                           67,8% |
| CCT-XS v1             |    0,7 |                2102 |                   82,1% |                                           67,7% |
| CCT-XS v1             |    0,9 |                1637 |                   86,6% |                                           55,6% |
| CCT-S v2              |    0,5 |                2089 |                   83,0% |                                           68,0% |
| CCT-S v2              |    0,7 |                2089 |                   83,0% |                                           68,0% |
| CCT-S v2              |    0,9 |                1702 |                   87,5% |                                           58,5% |
| CCT-XS v2             |    0,5 |                2108 |                   84,9% |                                           70,3% |
| CCT-XS v2             |    0,7 |                2108 |                   84,9% |                                           70,3% |
| CCT-XS v2             |    0,9 |                1788 |                   88,4% |                                           62,0% |

Con el OCR viejo (v1.0.0) y los umbrales actuales de la app solo el **46,7 %** de todas las matrículas llega al historial correctamente leído; con CCT-XS v2 es el **70,3 %**. Parte de esa mejora viene de que la confianza del nuevo es más alta y más informativa; si se conserva el OCR viejo habría que recalibrar los umbrales.

### Desglose

La v1.0.0 frente a esta rama, por iluminación y tipo de matrícula.

| Grupo                    | Matrículas | Encontradas (esta rama) | v1.0.0 (MobileViT v2): leídas OK de todas | Esta rama: leídas OK de todas |
| ------------------------ | ---------: | ----------------------: | ----------------------------------------: | ----------------------------: |
| Día                      |       2185 |                     90% |                                       66% |                           75% |
| Noche                    |        362 |                     86% |                                       62% |                           72% |
| Tipo A (estándar)        |       2498 |                     89% |                                       66% |                           75% |
| Tipo B (moto doble fila) |         31 |                     84% |                                       19% |                           65% |
| Tipo C (moto ligera)     |          1 |                    100% |                                        0% |                            0% |
| Tipo D (taxi/VTC)        |         11 |                    100% |                                       18% |                           55% |
| Tipo E (remolque)        |          6 |                     33% |                                        0% |                           33% |

Los tipos C y E tienen 1 y 6 matrículas: no son concluyentes. Las motos de doble fila (tipo B, 31 matrículas) pasan del 19 % con la v1.0.0 al 65 % con esta rama.

### Región (solo modelos v2)

| Modelo    | Predice "Spain" | "Unknown" | Otras regiones (las 3 más frecuentes)   |
| --------- | --------------: | --------: | --------------------------------------- |
| CCT-S v2  |           37,2% |      0,1% | Estonia 629, Austria 218, Belgium 117   |
| CCT-XS v2 |            4,7% |      0,0% | Estonia 1137, Portugal 315, Belgium 200 |

La cabeza de región de los CCT **no es fiable en matrículas españolas** (CCT-XS v2 responde «Spain» el 4,7 % de las veces y «Estonia» la mayoría). La app solo la propaga, no la muestra: conviene no usarla en la interfaz.

## Errores y calidad de la medida

### Deriva de la sesión

| Repetición de CCT-XS v2, umbral 0,6         | Mediana ms/img | Diferencia con la primera | Leídas OK (de todas) |
| ------------------------------------------- | -------------: | ------------------------: | -------------------: |
| CCT-XS v2, umbral 0,6                       |         154 ms |                         — |                70,9% |
| CCT-XS v2, umbral 0,6 (repetición a mitad)  |         153 ms |                     -0.7% |                70,9% |
| CCT-XS v2, umbral 0,6 (repetición al final) |         154 ms |                      0.1% |                70,9% |

La variante CCT-XS v2, umbral 0,6, repetida a mitad y al final de la fase 1 (~3 h) varía menos de un 1 % en tiempo y da exactamente el mismo acierto, por lo que las medidas de la sesión son comparables entre sí.

### Errores de esta rama

Operaciones de edición de esta rama (CCT-XS v2, umbral 0,25) sobre las matrículas encontradas: sustituciones 258, caracteres que faltan 158, caracteres de más 9.

| Confusión (real→leído) | Veces |
| ---------------------- | ----: |
| 0→O                    |    43 |
| Y→I                    |     4 |
| V→I                    |     3 |
| P→Y                    |     3 |
| W→S                    |     3 |
| N→W                    |     3 |
| 0→D                    |     3 |
| W→M                    |     3 |
| L→Z                    |     3 |
| 1→I                    |     3 |
| V→N                    |     3 |
| H→P                    |     2 |
| N→I                    |     2 |
| Z→R                    |     2 |

De las 362 lecturas con algún error de esta rama, 71 (20 %) se arreglan quitando una letra repetida (la caja gris del dataset se lee como copia de su vecino), así que parte de esos fallos son un artefacto de la anonimización.

La confusión dominante es **0→O** (43 casos). Las matrículas españolas no llevan vocales ni Q, así que corregir offline O/Q→0 e I→1 en cualquier posición subiría esta rama del 74,8 % al 79,0 % de matrículas leídas sin error. La corrección que aplica la rama es más estricta (solo lecturas de 7 caracteres con la forma de una matrícula española actual, para no tocar otros formatos) y nunca actúa en este dataset, donde las cajas grises dejan lecturas de 5 o 6 caracteres. Con matrículas reales debería recuperar parte de esos 4 puntos.

### Artefacto de las cajas grises

Aproximadamente una quinta parte de los fallos de esta rama se arregla quitando una letra duplicada junto a la caja gris. En fotos reales sin ese enmascarado el acierto debería ser algo mayor que el medido.

### Casos concretos

<VTDocAccordionGroup>
<VTDocAccordion title="Peores lecturas de esta rama">

| Imagen      | Real (· = tapado) | Lectura de esta rama | Confianza |
| ----------- | ----------------- | -------------------- | --------: |
| train/00449 | `·007C·S`         | ``                   |        0% |
| train/00451 | `·007C·S`         | ``                   |        0% |
| train/01126 | `191·LR·`         | `C__497`             |       21% |
| train/00849 | `62·6·DF`         | `GR6310`             |       41% |
| train/00004 | `01·3·TD`         | `UA33T`              |       62% |
| train/00108 | `9·17·NB`         | `11IB`               |       72% |
| train/00158 | `99·0·GB`         | `99S88`              |       74% |
| train/00559 | `05·9·BF`         | `O59`                |       69% |
| train/00997 | `C5·48BS·`        | `G5468S`             |       69% |
| train/01311 | `677·LV·`         | `877LVSSP`           |       82% |
| train/01863 | `906··WY`         | `806TR`              |       76% |
| train/00002 | `38·3·PV`         | `383PYI`             |       76% |
| train/00003 | `874··HP`         | `B874LPP`            |       70% |
| train/00131 | `0·66·RF`         | `O66RFF`             |       97% |
| train/00156 | `19·7·NV`         | `19TN`               |       81% |

</VTDocAccordion>
<VTDocAccordion title="Casos en los que la v1.0.0 acierta y esta rama no">

| Imagen      | Real (· = tapado) | v1.0.0 (MobileViT v2) | Esta rama |
| ----------- | ----------------- | --------------------- | --------- |
| train/00010 | `6·14·BM`         | `614BM`               | `614BMM`  |
| train/00019 | `88·0CC·`         | `880CC`               | `88OCC`   |
| train/00026 | `24·0JV·`         | `240JV`               | `24OJV`   |
| train/00028 | `1·15·GX`         | `115GX`               | `115GXX`  |
| train/00067 | `0·35·XN`         | `035XN`               | `O35XN`   |
| train/00090 | `0·21·HY`         | `021HHY`              | `O21HY`   |
| train/00102 | `·769F·Y`         | `769FY`               | `769FI`   |
| train/00107 | `M94·0W·`         | `M940W`               | `M94OW`   |
| train/00109 | `·019F·Y`         | `019FY`               | `019FI`   |
| train/00111 | `22·5G·N`         | `225GN`               | `225GH`   |
| train/00118 | `0·56CZ·`         | `056CZ`               | `O56CZ`   |
| train/00144 | `89·1·RZ`         | `891RRZ`              | `891RR`   |

</VTDocAccordion>
<VTDocAccordion title="Matrículas grandes que esta rama no encuentra">

| Imagen      | Real (· = tapado) | Ancho en la entrada de 384 | Tipo/luz |
| ----------- | ----------------- | -------------------------: | -------- |
| train/00494 | `0·60·GR`         |                     166 px | BN       |
| train/01139 | `433··PY`         |                     126 px | AD       |
| train/00106 | `00·1·DM`         |                     100 px | AD       |
| train/00796 | `785·H·B`         |                      90 px | AD       |
| train/01952 | `769··BH`         |                      83 px | AD       |
| train/00430 | `89·0JZ·`         |                      73 px | AN       |
| train/00439 | `414··NC`         |                      63 px | AN       |
| test/00818  | `7·03C·M`         |                      53 px | BD       |
| train/00431 | `77·2D·X`         |                      50 px | AN       |
| train/00429 | `30·5·XM`         |                      47 px | AN       |
| train/00429 | `58·3GT·`         |                      47 px | AN       |
| train/00424 | `·661·XM`         |                      46 px | AN       |

</VTDocAccordion>
</VTDocAccordionGroup>

## Rendimiento, memoria y tamaño

| Variante                                    | Carga modelos | Primera imagen (frío) | Mediana ms/img |     p95 | CPU del navegador ms/img | Memoria pico (MB) | Decodificar imagen (mediana) |
| ------------------------------------------- | ------------: | --------------------: | -------------: | ------: | -----------------------: | ----------------: | ---------------------------: |
| 8 hilos                                     |       1163 ms |                 84 ms |          47 ms |   57 ms |                   988 ms |              2352 |                        62 ms |
| Esta rama + 4 hilos                         |       1074 ms |                 92 ms |          56 ms |   66 ms |                   487 ms |              2533 |                        61 ms |
| 4 hilos                                     |       1097 ms |                 93 ms |          56 ms |   65 ms |                   488 ms |              1828 |                        62 ms |
| t-256                                       |       1084 ms |                 99 ms |          79 ms |   95 ms |                   177 ms |              2231 |                        61 ms |
| 2 hilos                                     |       1136 ms |                123 ms |          88 ms |  101 ms |                   294 ms |              2049 |                        62 ms |
| 4 hilos + t-640                             |       1165 ms |                178 ms |         132 ms |  143 ms |                   745 ms |              1755 |                        61 ms |
| Esta rama + t-640 + 4 hilos                 |       1190 ms |                188 ms |         134 ms |  145 ms |                   745 ms |              1582 |                        60 ms |
| v1.0.0 (MobileViT v2)                       |       1230 ms |                185 ms |         149 ms |  165 ms |                   249 ms |              1802 |                        60 ms |
| CCT-XS v2, umbral 0,6, ORT 1.24.3           |       1073 ms |                196 ms |         152 ms |  170 ms |                   254 ms |              2034 |                        61 ms |
| CCT-XS v1                                   |       1171 ms |                183 ms |         152 ms |  168 ms |                   254 ms |              1768 |                        61 ms |
| CCT-XS v2, umbral 0,6 (repetición a mitad)  |       1168 ms |                174 ms |         153 ms |  171 ms |                   253 ms |              1784 |                        60 ms |
| Letterbox (t-384)                           |       1157 ms |                174 ms |         153 ms |  169 ms |                   253 ms |              2034 |                        61 ms |
| CCT-XS v2, umbral 0,6                       |       1236 ms |                182 ms |         154 ms |  172 ms |                   254 ms |              1885 |                        61 ms |
| CCT-XS v2, umbral 0,6 (repetición al final) |       1175 ms |                175 ms |         154 ms |  171 ms |                   255 ms |              2043 |                        60 ms |
| Esta rama                                   |       1166 ms |                180 ms |         156 ms |  176 ms |                   258 ms |              2048 |                        60 ms |
| t-416                                       |       1214 ms |                213 ms |         182 ms |  201 ms |                   285 ms |              2060 |                        61 ms |
| CCT-S v2                                    |       1200 ms |                256 ms |         237 ms |  337 ms |                   349 ms |              1508 |                        60 ms |
| t-512                                       |       1276 ms |                303 ms |         266 ms |  285 ms |                   369 ms |              1533 |                        60 ms |
| Esta rama + s-608 + 4 hilos                 |       1339 ms |                351 ms |         287 ms |  300 ms |                  1388 ms |              1600 |                        60 ms |
| 4 hilos + s-608                             |       1368 ms |                342 ms |         289 ms |  300 ms |                  1391 ms |              1848 |                        60 ms |
| CCT-S v1                                    |       1202 ms |                351 ms |         312 ms |  488 ms |                   436 ms |              1522 |                        61 ms |
| Esta rama + t-640                           |       1355 ms |                433 ms |         392 ms |  421 ms |                   505 ms |              2099 |                        61 ms |
| t-640                                       |       1388 ms |                426 ms |         393 ms |  416 ms |                   504 ms |              1587 |                        61 ms |
| s-608                                       |       2008 ms |               1036 ms |        1039 ms | 1061 ms |                  1154 ms |              1599 |                        61 ms |

- **Multihilo:** 4 hilos dan 56 ms frente a 154–156 ms con un hilo (igual con CCT-XS v2 a umbral 0,6 que con esta rama); 8 hilos, 47 ms; 2 hilos, 88 ms. El coste es la CPU: unos 488 ms de CPU por imagen con 4 hilos frente a 254 ms con uno. En un móvil con menos núcleos la ganancia será menor.
- **Memoria:** el pico de RSS del navegador (1,5–2,5 GB) está dominado por la decodificación de fotos de hasta 64 MP en esta prueba, no por los modelos, y es ruidoso entre ejecuciones. No es una comparación fiable entre modelos.
- **Decodificar la imagen** cuesta más que la inferencia con 4 hilos (60 ms de mediana, 150 ms con 64 MP) y no depende del modelo. Con fotos de cámara reales, o redimensionando antes, esta parte cambia.
- **Carga de modelos:** 1,1–1,4 s para el detector pequeño, 2,0 s para s-608.
- **Primera imagen** (en frío): unos 30 ms más que la mediana.

<VTDocAccordionGroup>
<VTDocAccordion title="Tiempo de inferencia y de decodificación según la resolución">

| Resolución | Imágenes | Inferencia t-384 (mediana) | Decodificar (mediana) |
| ---------- | -------: | -------------------------: | --------------------: |
| 5184×3888  |      822 |                     156 ms |                 53 ms |
| 6960×4640  |      820 |                     155 ms |                 76 ms |
| 9248×6944  |      162 |                     159 ms |                150 ms |
| 2048×1536  |       77 |                     152 ms |                 10 ms |
| 2016×4480  |       46 |                     153 ms |                 23 ms |
| 4480×2016  |       36 |                     151 ms |                 30 ms |
| 6944×9248  |        6 |                     154 ms |                150 ms |
| 1536×2048  |        5 |                     155 ms |                 10 ms |
| 4624×3472  |        1 |                     140 ms |                 44 ms |

</VTDocAccordion>
<VTDocAccordion title="Tamaño de los modelos por variante">

| Variante                                    | Detector (MB) | OCR (MB) | Total modelos (MB) |
| ------------------------------------------- | ------------: | -------: | -----------------: |
| Esta rama + s-608 + 4 hilos                 |          36.4 |      8.3 |               44.7 |
| Esta rama + t-640                           |          15.6 |      8.3 |               23.9 |
| Esta rama + t-640 + 4 hilos                 |          15.6 |      8.3 |               23.9 |
| s-608                                       |          36.4 |      8.3 |               44.7 |
| 4 hilos + s-608                             |          36.4 |      8.3 |               44.7 |
| Esta rama                                   |           7.8 |      8.3 |               16.1 |
| Esta rama + 4 hilos                         |           7.8 |      8.3 |               16.1 |
| t-640                                       |          15.6 |      8.3 |               23.9 |
| 4 hilos + t-640                             |          15.6 |      8.3 |               23.9 |
| t-416                                       |          15.5 |      8.3 |               23.9 |
| 2 hilos                                     |           7.8 |      8.3 |               16.1 |
| 4 hilos                                     |           7.8 |      8.3 |               16.1 |
| 8 hilos                                     |           7.8 |      8.3 |               16.1 |
| CCT-XS v2, umbral 0,6 (repetición a mitad)  |           7.8 |      8.3 |               16.1 |
| CCT-XS v2, umbral 0,6 (repetición al final) |           7.8 |      8.3 |               16.1 |
| CCT-XS v2, umbral 0,6, ORT 1.24.3           |           7.8 |      8.3 |               16.1 |
| CCT-XS v2, umbral 0,6                       |           7.8 |      8.3 |               16.1 |
| t-512                                       |          15.6 |      8.3 |               23.9 |
| CCT-S v2                                    |           7.8 |     10.2 |               18.0 |
| CCT-XS v1                                   |           7.8 |      7.1 |               14.9 |
| v1.0.0 (MobileViT v2)                       |           7.8 |      5.0 |               12.8 |
| Letterbox (t-384)                           |           7.8 |      8.3 |               16.1 |
| CCT-S v1                                    |           7.8 |     12.6 |               20.4 |
| t-256                                       |          15.5 |      8.3 |               23.9 |

</VTDocAccordion>
</VTDocAccordionGroup>

### Medición en móviles reales

Para comprobar si el benchmark de sobremesa se extrapola, se midió el mismo pipeline de la app (estirar a cuadrado, YOLOv9, umbral 0,25, NMS, CCT-XS v2 y corrección de dígitos) en dos móviles Android con una página web de prueba aparte. Usa un subconjunto de **50 fotos del dataset** (72 matrículas, redimensionadas a 1600 px de lado) y 4 configuraciones del detector, todas con el mismo OCR. Los modelos y las imágenes se cargan antes de medir, de modo que los tiempos no incluyen ni la carga ni la decodificación. La configuración de esta rama (t-384, umbral 0,25, CCT-XS v2, como en el resto de la página) se repite al final para medir la deriva. La v1.0.0 no se midió en móvil. La página reproduce exactamente las cajas, textos y confianzas de la app en las mismas 50 fotos (0 diferencias), y también se ejecutó en el PC de referencia (Firefox).

| Dispositivo                        | Navegador            | Sistema    | Núcleos que informa | Aislamiento COOP/COEP |
| ---------------------------------- | -------------------- | ---------- | ------------------- | --------------------- |
| Oppo Find X9 Pro (gama alta, 2025) | Chrome 155 (Android) | Android 16 | 5                   | sí                    |
| OnePlus 6 (2018)                   | Chrome 155 (Android) | Android 11 | 7                   | sí                    |
| PC Ryzen 9 5900X (referencia)      | Firefox 157          | Linux      | 8                   | sí                    |

<VTDocFrame src="/benchmark/phones.svg" alt="Gráfico de puntos del tiempo mediano por foto de cada configuración del detector en el Oppo Find X9 Pro, el OnePlus 6 y el PC de referencia, en escala logarítmica." caption="Tiempo mediano por foto en cada dispositivo (escala logarítmica). El PC solo se midió con un hilo." />

Las tablas siguientes muestran un dispositivo cada vez; al elegir un dispositivo en una de ellas cambian las tres.

<VTDocTabs sync-key="benchmark-device">
<VTDocTab title="Oppo Find X9 Pro" value="oppo">

| Configuración                           | ms/img (mediana) | ms/img p95 | Imágenes/s | Encontradas | Leídas OK (de todas) | × el PC |
| --------------------------------------- | ---------------: | ---------: | ---------: | ----------: | -------------------: | ------: |
| YOLOv9-t 384, 1 hilo (esta rama)        |              250 |        321 |       3,79 |      88,9 % |               69,4 % |     1,7 |
| YOLOv9-t 640, 1 hilo                    |              521 |        641 |       1,86 |      95,8 % |               72,2 % |     1,4 |
| YOLOv9-t 640, 4 hilos                   |              278 |        345 |       3,50 |      95,8 % |               72,2 % |       — |
| YOLOv9-s 608, 4 hilos                   |              579 |        772 |       1,69 |      94,4 % |               75,0 % |       — |
| YOLOv9-t 384, 1 hilo, repetida al final |              242 |        313 |       4,07 |      88,9 % |               69,4 % |       — |

</VTDocTab>
<VTDocTab title="OnePlus 6" value="oneplus-6">

| Configuración                           | ms/img (mediana) | ms/img p95 | Imágenes/s | Encontradas | Leídas OK (de todas) | × el PC |
| --------------------------------------- | ---------------: | ---------: | ---------: | ----------: | -------------------: | ------: |
| YOLOv9-t 384, 1 hilo (esta rama)        |             2884 |       3509 |       0,34 |      88,9 % |               69,4 % |    19,1 |
| YOLOv9-t 640, 1 hilo                    |             7038 |       7821 |       0,14 |      95,8 % |               72,2 % |    18,4 |
| YOLOv9-t 640, 4 hilos                   |             2049 |       2323 |       0,48 |      95,8 % |               72,2 % |       — |
| YOLOv9-s 608, 4 hilos                   |             5560 |       5855 |       0,18 |      94,4 % |               75,0 % |       — |
| YOLOv9-t 384, 1 hilo, repetida al final |             2859 |       3484 |       0,34 |      88,9 % |               69,4 % |       — |

</VTDocTab>
<VTDocTab title="PC (referencia)" value="pc">

| Configuración                    | ms/img (mediana) | ms/img p95 | Imágenes/s | Encontradas | Leídas OK (de todas) | × el PC |
| -------------------------------- | ---------------: | ---------: | ---------: | ----------: | -------------------: | ------: |
| YOLOv9-t 384, 1 hilo (esta rama) |              151 |        178 |       6,42 |      88,9 % |               63,9 % |       1 |
| YOLOv9-t 640, 1 hilo             |              382 |        421 |       2,59 |      95,8 % |               73,6 % |       1 |

</VTDocTab>
</VTDocTabs>

<VTDocTabs sync-key="benchmark-device">
<VTDocTab title="Oppo Find X9 Pro" value="oppo">

| Configuración                           | Preparar entrada (mediana) | Detector (mediana) | OCR (mediana) |
| --------------------------------------- | -------------------------: | -----------------: | ------------: |
| YOLOv9-t 384, 1 hilo (esta rama)        |                         37 |                167 |            42 |
| YOLOv9-t 640, 1 hilo                    |                         56 |                422 |            35 |
| YOLOv9-t 640, 4 hilos                   |                         62 |                186 |            20 |
| YOLOv9-s 608, 4 hilos                   |                         47 |                504 |            20 |
| YOLOv9-t 384, 1 hilo, repetida al final |                         37 |                156 |            38 |

</VTDocTab>
<VTDocTab title="OnePlus 6" value="oneplus-6">

| Configuración                           | Preparar entrada (mediana) | Detector (mediana) | OCR (mediana) |
| --------------------------------------- | -------------------------: | -----------------: | ------------: |
| YOLOv9-t 384, 1 hilo (esta rama)        |                        136 |               2435 |           309 |
| YOLOv9-t 640, 1 hilo                    |                        174 |               6527 |           300 |
| YOLOv9-t 640, 4 hilos                   |                        142 |               1766 |           110 |
| YOLOv9-s 608, 4 hilos                   |                        129 |               5291 |           113 |
| YOLOv9-t 384, 1 hilo, repetida al final |                        138 |               2403 |           309 |

</VTDocTab>
<VTDocTab title="PC (referencia)" value="pc">

| Configuración                    | Preparar entrada (mediana) | Detector (mediana) | OCR (mediana) |
| -------------------------------- | -------------------------: | -----------------: | ------------: |
| YOLOv9-t 384, 1 hilo (esta rama) |                         12 |                124 |            14 |
| YOLOv9-t 640, 1 hilo             |                         30 |                334 |            15 |

</VTDocTab>
</VTDocTabs>

- **El acierto no depende del dispositivo.** Los dos móviles dan los mismos resultados (69,4 / 72,2 / 72,2 / 75,0 %) porque el cálculo es determinista. El PC da 63,9 % con la configuración de esta rama frente a 69,4 % en los móviles con la misma detección (88,9 %); la causa más probable es que Firefox y Chrome reescalan distinto la imagen. Con solo 72 matrículas la diferencia no es significativa (intervalo de unos ±10 puntos), así que estas cifras sirven para comparar configuraciones entre sí, no para estimar el acierto absoluto: para eso están las 2547 matrículas del benchmark grande.
- **El tiempo sí depende mucho del dispositivo.** Con la configuración de esta rama (t-384, 1 hilo) el Oppo tarda 250 ms por foto (1,7 veces el PC) y el OnePlus 6, **2884 ms (19 veces el PC)**: unas 0,34 fotos por segundo. El detector es lo que más pesa en los dos, y en el OnePlus 6 también el OCR (309 ms frente a 42 ms).
- **Los hilos compensan más que cambiar de modelo.** En el OnePlus 6, t-640 con 4 hilos (2049 ms) es **más rápido que esta rama** (2884 ms) y encuentra el 95,8 % de las matrículas frente al 88,9 %. En el Oppo cuesta algo más (278 ms frente a 250 ms). Con 1 hilo, t-640 es 2 veces más lento en el Oppo y 2,4 veces en el OnePlus 6.
- **s-608 no compensa en móvil.** Gana 2,8 puntos de lectura sobre t-640 (75,0 % frente a 72,2 %, 2 matrículas de 72, dentro del ruido) y tarda 2,1 veces (Oppo) y 2,7 veces (OnePlus 6) más con 4 hilos.
- **Sin sobrecalentamiento en pasadas cortas.** En el OnePlus 6, el último cuarto de cada pasada tarda como el primero (entre −0,5 % y +4,3 %); en el Oppo es el primer cuarto el más lento (entre −7 % y −21 %), lo que apunta a que el procesador sube de frecuencia al empezar. Las pasadas duran entre 14 s (Oppo) y 6 min (OnePlus 6); no se activó la prueba sostenida, así que el calor con minutos de uso continuo sigue sin medirse.

<VTDocTabs sync-key="benchmark-device">
<VTDocTab title="Oppo Find X9 Pro" value="oppo">

| Configuración                           | Primer cuarto (ms) | Último cuarto (ms) |  Cambio |
| --------------------------------------- | -----------------: | -----------------: | ------: |
| YOLOv9-t 384, 1 hilo (esta rama)        |                298 |                253 | -15,0 % |
| YOLOv9-t 640, 1 hilo                    |                564 |                527 |  -6,6 % |
| YOLOv9-t 640, 4 hilos                   |                319 |                276 | -13,6 % |
| YOLOv9-s 608, 4 hilos                   |                637 |                570 | -10,4 % |
| YOLOv9-t 384, 1 hilo, repetida al final |                274 |                216 | -21,0 % |

</VTDocTab>
<VTDocTab title="OnePlus 6" value="oneplus-6">

| Configuración                           | Primer cuarto (ms) | Último cuarto (ms) | Cambio |
| --------------------------------------- | -----------------: | -----------------: | -----: |
| YOLOv9-t 384, 1 hilo (esta rama)        |               2890 |               3013 | +4,3 % |
| YOLOv9-t 640, 1 hilo                    |               7071 |               7141 | +1,0 % |
| YOLOv9-t 640, 4 hilos                   |               2099 |               2089 | -0,5 % |
| YOLOv9-s 608, 4 hilos                   |               5593 |               5580 | -0,2 % |
| YOLOv9-t 384, 1 hilo, repetida al final |               2865 |               2977 | +3,9 % |

</VTDocTab>
<VTDocTab title="PC (referencia)" value="pc">

| Configuración                    | Primer cuarto (ms) | Último cuarto (ms) | Cambio |
| -------------------------------- | -----------------: | -----------------: | -----: |
| YOLOv9-t 384, 1 hilo (esta rama) |                152 |                156 | +2,7 % |
| YOLOv9-t 640, 1 hilo             |                382 |                386 | +0,9 % |

</VTDocTab>
</VTDocTabs>

<VTDocInfo>

**Notas de la medición.** Una primera tanda en el OnePlus 6 se hizo con Google Play actualizando apps en paralelo y se repitió. Con 1 hilo no cambió (2761 frente a 2884 ms), pero con 4 hilos sí: t-640 pasó de 2834 a 2049 ms y s-608 de 7264 a 5560 ms. Los números de la tabla son los de la segunda tanda. Antes de medir en un móvil hay que cerrar el resto de procesos, porque el multihilo es sensible a la carga de fondo. Los tres dispositivos tuvieron aislamiento COOP/COEP (mediante un service worker de la página de prueba, ya que el alojamiento no permitía cabeceras) y los hilos pedidos fueron los efectivos.

</VTDocInfo>

<VTDocTip>

**Qué implica para un modo cámara o vídeo.** Con t-384 y un hilo, el OnePlus 6 procesa una imagen cada 3 s y el Oppo unas 4 por segundo. Para vídeo hay que procesar solo el último fotograma disponible y descartar el resto, y en dispositivos de gama baja habría que reducir el detector (t-256 y t-416 se midieron en el benchmark grande, pero no en móvil). Subir el acierto con un detector mayor solo es razonable si no baja los fotogramas por segundo; el multihilo es lo que hace posible t-640 sin perder velocidad.

</VTDocTip>

## Entorno

<VTDocAccordionGroup>
<VTDocAccordion title="Navegador, aislamiento COOP/COEP y CPU libre por variante">

| Variante                                    | Navegador     | Aislamiento COOP/COEP | CPU libre antes | Governor  |
| ------------------------------------------- | ------------- | --------------------- | --------------: | --------- |
| Esta rama + s-608 + 4 hilos                 | 153.0.8010.12 | sí                    |           99.6% | powersave |
| Esta rama + t-640                           | 153.0.8010.12 | no                    |           97.6% | powersave |
| Esta rama + t-640 + 4 hilos                 | 153.0.8010.12 | sí                    |           99.7% | powersave |
| s-608                                       | 153.0.8010.12 | no                    |           99.3% | powersave |
| 4 hilos + s-608                             | 153.0.8010.12 | sí                    |           99.6% | powersave |
| Esta rama                                   | 153.0.8010.12 | no                    |           97.5% | powersave |
| Esta rama + 4 hilos                         | 153.0.8010.12 | sí                    |           99.6% | powersave |
| t-640                                       | 153.0.8010.12 | no                    |           99.4% | powersave |
| 4 hilos + t-640                             | 153.0.8010.12 | sí                    |           99.6% | powersave |
| t-416                                       | 153.0.8010.12 | no                    |           98.8% | powersave |
| 2 hilos                                     | 153.0.8010.12 | sí                    |           98.9% | powersave |
| 4 hilos                                     | 153.0.8010.12 | sí                    |           98.7% | powersave |
| 8 hilos                                     | 153.0.8010.12 | sí                    |           98.3% | powersave |
| CCT-XS v2, umbral 0,6 (repetición a mitad)  | 153.0.8010.12 | no                    |           99.4% | powersave |
| CCT-XS v2, umbral 0,6 (repetición al final) | 153.0.8010.12 | no                    |           99.7% | powersave |
| CCT-XS v2, umbral 0,6, ORT 1.24.3           | 153.0.8010.12 | no                    |           98.1% | powersave |
| CCT-XS v2, umbral 0,6                       | 153.0.8010.12 | no                    |           98.6% | powersave |
| t-512                                       | 153.0.8010.12 | no                    |           99.1% | powersave |
| CCT-S v2                                    | 153.0.8010.12 | no                    |           98.8% | powersave |
| CCT-XS v1                                   | 153.0.8010.12 | no                    |           98.4% | powersave |
| v1.0.0 (MobileViT v2)                       | 153.0.8010.12 | no                    |           99.7% | powersave |
| Letterbox (t-384)                           | 153.0.8010.12 | no                    |           99.3% | powersave |
| CCT-S v1                                    | 153.0.8010.12 | no                    |           98.2% | powersave |
| t-256                                       | 153.0.8010.12 | no                    |           98.8% | powersave |

</VTDocAccordion>
</VTDocAccordionGroup>

## Limitaciones

- **Dos sesiones**: la fase 1 (18 variantes) y la fase 2 (6 combinaciones, mismas condiciones) se ejecutaron por separado; las variantes de la fase 2 no tienen repetición propia (las repeticiones de la fase 1 sí cubren la deriva de esa sesión).
- **Una sola pasada por variante** (la deriva entre repeticiones es <1 %, pero no hay desviaciones por variante).
- **Gobernador de CPU `powersave`** (amd-pstate-epp): no se pudo cambiar sin privilegios. Afecta al valor absoluto de los tiempos, no a las comparaciones relativas dentro de la sesión.
- **Hardware de sobremesa** (Ryzen 9 5900X, 12 núcleos) en el benchmark grande. La medición en móvil ([Medición en móviles reales](#medicion-en-moviles-reales)) cubre solo dos dispositivos Android y 50 fotos (72 matrículas): sirve para comparar configuraciones y estimar tiempos, no el acierto absoluto, y no hay dispositivos de gama media ni iOS.
- **Ground truth parcial** (2 caracteres tapados por matrícula) y artefacto de repetición de letra.
- **Un solo dataset** de matrículas españolas, sobre todo de día y con fotos de alta resolución. No hay medición con vídeo/cámara en directo, ni la prueba sostenida de calor en móvil.
- **Contaminación de entrenamiento desconocida:** no se sabe si los detectores u OCR vieron imágenes de este dataset.
- «Detecciones sin matrícula anotada» sobrestima los falsos positivos, porque hay matrículas de fondo sin anotar.

<VTDocWarning>

El multihilo exige `Cross-Origin-Opener-Policy: same-origin` y `Cross-Origin-Embedder-Policy: require-corp` y servir el glue de ORT aparte con `ort.env.wasm.wasmPaths`; hay que comprobar que el alojamiento lo permite.

</VTDocWarning>

## Recomendaciones y estado

<VTDocCheck>

**Aplicado** en la rama `feature/ocr-cct-v2`:

1. **OCR CCT-XS v2** y onnxruntime-web 1.30 (`60c8d83`), en lugar del OCR viejo y de CCT-S v2 (que se había usado primero). Modelo y configuración antiguos eliminados. +5,7 puntos medidos.
2. **Umbral del detector a 0,25** (`a0d2d60`). +4,0 puntos medidos.
3. **Corrección de O/Q→0 e I→1** en el bloque numérico de matrículas españolas (4 dígitos + 3 consonantes, `80fa22e`). Solo actúa sobre lecturas de 7 caracteres, así que nunca se aplica en este dataset, donde las cajas grises dejan lecturas de 5 o 6 caracteres, y su efecto no se ha podido medir. Una corrección offline más amplia (en cualquier posición) sumaría 4,2 puntos.
4. **Descarte de matrículas cortadas por el borde** (`407e88d`) en la validación de matrículas. Decide qué matrículas llegan al historial y no se ha simulado.

</VTDocCheck>

<VTDocInfo>

**Pendiente de decidir:**

5. **Multihilo con este detector** (4 hilos): 56 ms frente a 156 ms en escritorio, con exactamente las mismas lecturas. Necesita `Cross-Origin-Opener-Policy: same-origin` y `Cross-Origin-Embedder-Policy: require-corp`; sin ellas la app sigue en un hilo. No se ha medido en móvil con t-384 (solo con t-640, donde bajó de 7,0 a 2,0 s en el OnePlus 6).
6. **Detector mayor, solo según el dispositivo** ([Por qué esta rama mantiene el detector t-384](#por-que-esta-rama-mantiene-el-detector-t-384)): t-640 con 4 hilos da 78,4 % en 134 ms en escritorio y es más rápido que esta rama en el OnePlus 6 (2049 frente a 2884 ms), con 7 puntos más de matrículas encontradas; s-608 da 81,6 % en 287 ms, pero no compensa en móvil. Antes de usarlos: medir los dispositivos objetivo (gama baja y terminales robustos), la batería y el calor con uso continuo, y el comportamiento con vídeo/cámara.
7. Actualizar la documentación: «matrículas europeas» describe el modelo anterior; el CCT es global.
8. No mostrar la región que predice el CCT.

</VTDocInfo>

## Reproducibilidad

El benchmark vive fuera de este repositorio. Incluye un script que compila cada variante a partir de la app (`git archive` más parches), un ejecutor que carga los modelos una vez por variante en un Chromium nuevo y mide el Web Worker real de la app, y un script de análisis que puntúa los resultados contra el ground truth del dataset y genera las tablas y gráficos de esta página. Los resultados en bruto se guardan por variante en JSON, junto con el entorno de cada ejecución.

## Cita y atribuciones

**Dataset UC3M-LP** (licencia [ODbL-1.0](https://opendatacommons.org/licenses/odbl/1-0/)) — [repositorio](https://github.com/ramajoballester/UC3M-LP) · descarga: [DOI 10.21950/OS5W4Z](https://doi.org/10.21950/OS5W4Z) · [Zenodo](https://zenodo.org/records/17152029)

Citar, como pide el autor del dataset:

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

**Modelos evaluados:** [fast-plate-ocr](https://github.com/ankandrew/fast-plate-ocr), [open-image-models](https://github.com/ankandrew/open-image-models) y [fast-alpr](https://github.com/ankandrew/fast-alpr) (ankandrew, licencia MIT).

**Runtime:** [onnxruntime-web](https://github.com/microsoft/onnxruntime) 1.30.0 y 1.24.3. **Automatización:** [Playwright](https://playwright.dev) sobre Chromium.
