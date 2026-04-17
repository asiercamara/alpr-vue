---
title: 'Preguntas Frecuentes sobre ALPR Vue'
description: 'Respuestas rápidas a las preguntas más comunes sobre ALPR Vue: uso sin conexión, privacidad, formatos de matrícula compatibles, controles de cámara en móvil, comportamiento de detención automática y alojamiento propio.'
---

Aquí encontrarás respuestas rápidas a las preguntas que los usuarios hacen con más frecuencia. Si no encuentras lo que buscas, consulta la [guía de solución de problemas](/es/troubleshooting) para obtener ayuda paso a paso con problemas específicos.

<AccordionGroup>
  <Accordion title="¿Funciona ALPR Vue sin conexión?">
    Sí. Tras la primera vez que abres la aplicación — que descarga los archivos del modelo de IA desde el servidor — todo funciona completamente sin conexión. Puedes cerrar el navegador, desconectarte de internet y reabrir la aplicación más tarde; la detección sigue funcionando sin ninguna conexión de red. Los archivos del modelo los almacena automáticamente en caché tu navegador.
  </Accordion>

  <Accordion title="¿Mis imágenes o la imagen de la cámara se suben a algún lugar?">
    No. Todo el procesamiento ocurre completamente dentro de tu navegador usando WebAssembly. Tu imagen de la cámara, las fotos cargadas y los vídeos cargados nunca salen de tu dispositivo — no se envían a ningún servidor. Consulta [cómo funciona](/es/how-it-works) para una explicación técnica del canal de procesamiento local.
  </Accordion>

  <Accordion title="¿Qué formatos de matrícula son compatibles?">
    ALPR Vue está optimizado para **matrículas europeas**. El modelo OCR lee matrículas alfanuméricas de 4 a 10 caracteres y gestiona mejor los formatos europeos habituales. Las matrículas de otras regiones pueden detectarse y leerse, pero la precisión tiende a ser menor. El modelo valida específicamente las matrículas que coinciden con el patrón de 2–4 caracteres alfanuméricos, un separador opcional y otros 2–4 caracteres alfanuméricos.

    <Note>
      Si trabajas regularmente con matrículas de una región específica fuera de Europa y la precisión es baja, intenta bajar el **Umbral de confianza** en Ajustes para permitir que pasen más detecciones, y corrige manualmente los caracteres mal leídos.
    </Note>

  </Accordion>

  <Accordion title="¿Puedo usarlo en el móvil?">
    Sí. ALPR Vue está diseñado teniendo en cuenta los dispositivos móviles y funciona en navegadores modernos de iOS y Android. En móvil puedes:

    - Tocar **Cambiar cámara** para alternar entre la cámara frontal y trasera.
    - Usar los botones **Zoom +** / **Zoom −** para ajustar la vista (zoom de hardware cuando tu dispositivo lo admite, zoom digital en caso contrario).
    - Añadir la aplicación a la pantalla de inicio desde el menú de tu navegador para una experiencia a pantalla completa similar a una app nativa.

    Consulta [modo cámara](/es/camera-mode) para obtener detalles sobre todos los controles de la cámara.

  </Accordion>

  <Accordion title="¿Por qué la aplicación detiene la cámara automáticamente?">
    Por defecto, la cámara se detiene en cuanto confirma una matrícula. Esto evita que la aplicación escanee el mismo vehículo repetidamente y ahorra batería.

    El tiempo de confirmación depende de la confianza del modelo:
    - **Modo estándar:** la misma matrícula debe aparecer de forma continua durante **3 segundos** antes de confirmarse.
    - **Modo de alta confianza:** si la confianza OCR media de la detección es 0,8 o superior, la cámara se detiene tras solo **1 segundo**.

    Si necesitas que la cámara siga funcionando tras cada detección — por ejemplo, al registrar múltiples vehículos en una entrada — activa el **Modo continuo** en el panel de Ajustes (icono de engranaje en el encabezado).

  </Accordion>

  <Accordion title="¿Puedo leer matrículas de fotos o vídeos que ya tengo?">
    Sí. Toca el botón **Cargar archivo** en la pantalla principal y selecciona cualquier imagen o archivo de vídeo guardado en tu dispositivo. La aplicación procesa las imágenes de inmediato y escanea los vídeos fotograma a fotograma, extrayendo cada matrícula que aparece en el clip.

    También puedes explorar la galería de muestras integrada, que incluye 10 fotos reales de coches y 3 clips de vídeo de tráfico — útil para probar la aplicación sin necesitar un vehículo cerca.

    Consulta [cargar archivos](/es/upload-files) para obtener instrucciones completas.

  </Accordion>

  <Accordion title="¿Por qué la puntuación de confianza es baja para algunos caracteres?">
    El modelo OCR asigna una puntuación de confianza individual a cada carácter que lee. Varios factores pueden causar baja confianza en caracteres específicos:

    - **Brillo o reflejos** en la superficie de la matrícula
    - **Suciedad, daños o desgaste** en caracteres individuales
    - **Desenfoque por movimiento** de un vehículo en movimiento o una cámara inestable
    - **Ángulo pronunciado** — las matrículas se leen mejor cuando la cámara las enfoca directamente
    - **Oclusión parcial** — un carácter tapado por un enganche, pegatina o sombra

    Los caracteres con baja confianza se muestran en la vista detallada de la matrícula con una barra de confianza en rojo. Puedes tocar cualquier matrícula en tu historial y luego tocar **Editar** para corregir manualmente cualquier carácter mal leído.

  </Accordion>

  <Accordion title="¿Qué hace 'Omitir duplicados'?">
    Cuando **Omitir duplicados** está activado (el valor predeterminado), la aplicación ignora silenciosamente cualquier detección cuyo texto ya exista en tu historial. Esto evita que el mismo vehículo aparezca varias veces cuando lo escaneas más de una vez.

    Desactiva **Omitir duplicados** en Ajustes si necesitas registrar cada evento de detección individualmente — por ejemplo, si estás registrando la misma matrícula apareciendo en diferentes momentos a lo largo de un turno.

    Puedes encontrar este interruptor en **Ajustes > Omitir alertas de duplicados**. Consulta [ajustes de detección](/es/detection-settings) para todas las opciones relacionadas con la detección.

  </Accordion>

  <Accordion title="¿Hay una aplicación móvil nativa?">
    No hay ninguna aplicación nativa de iOS o Android. ALPR Vue es una **aplicación web progresiva (PWA)**, lo que significa que puedes añadirla a tu pantalla de inicio directamente desde tu navegador móvil para obtener una experiencia similar a una app nativa con vista a pantalla completa y sin la barra del navegador.

    Para añadirla a la pantalla de inicio:
    - **iOS (Safari):** Toca el icono de compartir y luego toca **Añadir a pantalla de inicio**.
    - **Android (Chrome):** Toca el menú de tres puntos y luego toca **Añadir a pantalla de inicio** o **Instalar app**.

  </Accordion>

  <Accordion title="¿Puedo alojar ALPR Vue yo mismo?">
    Sí. ALPR Vue es de código abierto y puedes alojarlo en cualquier host web estático. Compila el proyecto y sirve la carpeta de salida desde cualquier servicio de alojamiento estático. El único requisito imprescindible es servirlo mediante **HTTPS** — los navegadores bloquean el acceso a la cámara en HTTP simple.

    Visita el [repositorio de GitHub](https://github.com/asiercamara/alpr-vue) para obtener el código fuente completo e instrucciones de despliegue.

  </Accordion>
</AccordionGroup>
