---
title: 'Modelos de IA para el Reconocimiento de Matrículas'
description: 'Conoce el detector de matrículas YOLOv9 y el modelo OCR MobileViT v2 que impulsan ALPR Vue — ambos se ejecutan localmente en tu navegador sin necesidad de ninguna API en la nube.'
---

ALPR Vue utiliza dos modelos ONNX que se ejecutan localmente en tu navegador — sin API en la nube, sin inferencia remota. El primer modelo detecta dónde están las matrículas en la imagen; el segundo lee los caracteres de cada matrícula. Ambos modelos se cargan directamente en tu pestaña del navegador usando ONNX Runtime Web.

<Tabs>
  <Tab title="Detector de matrículas">
    El detector de matrículas analiza cada fotograma y dibuja recuadros delimitadores alrededor de las matrículas que encuentra.

    | Propiedad | Valor |
    |---|---|
    | Archivo del modelo | `yolo-v9-t-384-license-plates-end2end.onnx` |
    | Arquitectura | YOLOv9 (detección de objetos en una sola pasada) |
    | Resolución de entrada | 384 × 384 píxeles |
    | Fuente | [open-image-models](https://github.com/ankandrew/open-image-models) |

    **Cómo funciona:** El modelo redimensiona cada fotograma a 384 × 384 píxeles y analiza toda la imagen en una sola pasada hacia adelante por la red neuronal. Divide la imagen en una cuadrícula y predice recuadros delimitadores y puntuaciones de confianza para cada celda. El resultado es un conjunto de recuadros — uno para cada región de matrícula encontrada.

    El modelo es una variante compacta YOLOv9-t, diseñada para funcionar eficientemente en dispositivos con recursos limitados como teléfonos y portátiles. Ha sido entrenada específicamente en matrículas europeas bajo diversas condiciones de iluminación y ángulos de cámara.

  </Tab>
  <Tab title="OCR de matrículas">
    El modelo OCR de matrículas lee los caracteres de cada región de matrícula detectada y asigna una puntuación de confianza a cada carácter.

    | Propiedad | Valor |
    |---|---|
    | Archivo del modelo | `european_mobile_vit_v2_ocr.onnx` |
    | Arquitectura | MobileViT v2 (CNN con múltiples cabezas de salida) |
    | Resolución de entrada | 140 × 70 píxeles |
    | Alfabeto | A–Z, 0–9, guion, guion bajo (usado como relleno) |
    | Longitud máxima de matrícula | 9 caracteres |
    | Fuente | [open-image-models](https://github.com/ankandrew/open-image-models) |

    **Cómo funciona:** La región de la matrícula recortada se redimensiona a 140 × 70 píxeles y se convierte a escala de grises. El modelo procesa esta imagen a través de una serie de capas convolucionales. Tiene 9 cabezas de salida — una por cada posición de carácter posible en la matrícula. Cada cabeza produce una distribución de probabilidad sobre el alfabeto completo, y el carácter con mayor probabilidad se selecciona para esa posición. Los caracteres de relleno se eliminan del resultado final, dejando solo el texto real de la matrícula.

    Como cada carácter tiene su propia cabeza de salida, el modelo reporta una puntuación de confianza individual por carácter. Puedes ver estas puntuaciones en la vista detallada de la matrícula tocando cualquier entrada de tu historial.

  </Tab>
</Tabs>

## Formato de los modelos

Ambos modelos se almacenan en formato **ONNX** (Open Neural Network Exchange — Intercambio Abierto de Redes Neuronales). ONNX es un estándar abierto para representar modelos de aprendizaje automático, lo que hace posible ejecutar modelos entrenados en Python directamente en el navegador.

ALPR Vue usa **ONNX Runtime Web** para ejecutar la inferencia. Esta biblioteca compila los modelos a WebAssembly, que se ejecuta de forma nativa en navegadores modernos sin necesidad de plugins o extensiones. El resultado es una velocidad de inferencia casi nativa completamente dentro de tu pestaña del navegador.

## Limitaciones

<Warning>
  Los modelos están optimizados para matrículas europeas. La precisión de detección y OCR puede ser menor para matrículas de otras regiones, especialmente las que usan diferentes juegos de caracteres, dimensiones o formatos de matrícula.
</Warning>

- **Cobertura regional:** Ambos modelos fueron entrenados principalmente con matrículas europeas. La precisión varía para matrículas de Norteamérica, Asia y otras regiones.
- **Rendimiento del dispositivo:** La velocidad de inferencia depende de la CPU de tu dispositivo. Los dispositivos más antiguos o de bajo consumo pueden experimentar tasas de fotogramas más lentas.
- **Requisitos del navegador:** ONNX Runtime Web requiere compatibilidad con WebAssembly. Todos los navegadores modernos lo admiten, pero versiones muy antiguas pueden no hacerlo.

<Note>
  Los modelos se descargan una vez en tu primera visita y tu navegador los almacena en caché. En visitas posteriores, la aplicación los carga desde la caché local del navegador — no se necesita ninguna solicitud de red y la aplicación funciona completamente sin conexión.
</Note>
