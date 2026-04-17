---
title: 'Primeros pasos con ALPR Vue'
description: 'Detecta tu primera matrícula en minutos — abre la aplicación, permite el acceso a la cámara, apunta hacia un vehículo y consulta el resultado con su puntuación de confianza.'
---

Esta guía te lleva paso a paso para detectar tu primera matrícula con ALPR Vue. Al final tendrás la cámara en funcionamiento, una matrícula guardada en el historial y sabrás cómo inspeccionar y copiar el resultado.

## Detectar una matrícula con la cámara en vivo

<Steps>
  <Step title="Abre la aplicación en un navegador compatible">
    Abre ALPR Vue en un navegador moderno como Chrome, Edge, Firefox o Safari 16+. Para que la cámara funcione, la página debe servirse mediante **HTTPS o localhost** — este es un requisito de seguridad del navegador, no algo específico de ALPR Vue. Si accedes a una instancia propia, asegúrate de que usa una conexión segura.

    ¿No sabes si tu navegador es compatible? Consulta [Navegadores compatibles y requisitos del dispositivo](/es/browser-requirements).

  </Step>
  <Step title="Concede permisos a la cámara">
    Haz clic en **Iniciar cámara**. Tu navegador preguntará si ALPR Vue puede acceder a tu cámara. Haz clic en **Permitir**.

    <Tip>
      Si accidentalmente hiciste clic en **Bloquear**, o si el aviso de permiso nunca apareció, puedes restablecerlo en la configuración del navegador. En Chrome, haz clic en el icono del candado en la barra de direcciones y establece **Cámara** en **Permitir**. En Safari, ve a **Ajustes → Sitios web → Cámara** y permite el acceso para el sitio. A continuación, recarga la página.
    </Tip>

  </Step>
  <Step title="Apunta la cámara hacia un vehículo">
    Una vez activa la cámara, sostén el teléfono o coloca la cámara web de forma que la matrícula sea claramente visible. La aplicación escanea automáticamente — no necesitas pulsar nada. Aparece un recuadro de detección en pantalla cuando se detecta una matrícula.
  </Step>
  <Step title="Consulta la matrícula detectada en el historial">
    Cuando la aplicación confirma una detección, añade la matrícula al historial de la derecha (o debajo de la cámara en móvil). Cada entrada muestra el texto de la matrícula, una puntuación de confianza y la hora de detección. La cámara se detiene automáticamente tras la confirmación.

    <Note>
      La cámara se detiene automáticamente después de **3 segundos** de detección continua. Si la detección tiene una confianza media alta (0,8 o superior), se detiene tras solo **1 segundo**. Esto evita capturas duplicadas. Puedes cambiar este tiempo — o activar el modo continuo — en [Ajustes de detección](/es/detection-settings).
    </Note>

  </Step>
  <Step title="Inspecciona, edita y copia el resultado">
    Toca o haz clic en cualquier matrícula del historial para abrir la vista detallada. Aquí puedes:

    - Ver una imagen recortada de la matrícula detectada
    - Revisar la puntuación de confianza de cada carácter individual, mostrada como barras con código de color
    - Hacer clic en **Editar** para corregir cualquier carácter mal leído
    - Hacer clic en **Copiar** para copiar el texto de la matrícula al portapapeles

  </Step>
</Steps>

## Pruébalo sin cámara

No necesitas tener un vehículo cerca para explorar la aplicación. ALPR Vue incluye una galería de muestras integrada con **10 fotos reales de coches** y **3 clips de vídeo de tráfico**. Haz clic en **Cargar archivo** en la pantalla principal y abre la galería de muestras para elegir cualquier muestra. La aplicación la procesa a través del mismo canal de IA y añade las matrículas detectadas a tu historial, igual que con la cámara en vivo.

Es una excelente forma de familiarizarte con los resultados, las puntuaciones de confianza y la vista detallada antes de probar con tus propias imágenes.
