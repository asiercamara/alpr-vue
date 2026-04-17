---
title: 'Solución de Problemas de ALPR Vue'
description: 'Soluciona los problemas más comunes de ALPR Vue: errores de permiso de cámara, fallos al cargar el modelo, detecciones perdidas o con texto incorrecto, rendimiento lento y ajustes que no se guardan.'
---

Si algo no funciona como esperabas, empieza aquí. La mayoría de los problemas se encuadran en un puñado de categorías — permisos de cámara, carga del modelo de IA, calidad de detección o compatibilidad del navegador. Revisa la sección correspondiente a continuación y, si el problema persiste, abre la consola del navegador (pulsa F12 y abre la pestaña **Consola**) para buscar mensajes de error que ayuden a identificar la causa.

<AccordionGroup>
  <Accordion title="La cámara no inicia / 'Acceso a la cámara denegado'">
    Los errores de cámara casi siempre se deben a un permiso que falta, una URL de página no segura o un bloqueo a nivel de sistema.

    **Comprueba el permiso del navegador:**
    Es posible que tu navegador haya bloqueado la cámara cuando visitaste la página por primera vez. Busca el icono de cámara en la barra de direcciones, haz clic en él y selecciona **Permitir**. Luego actualiza la página e intenta iniciar la cámara de nuevo.

    **Comprueba los ajustes de privacidad del sistema (móvil):**
    En iOS, ve a **Ajustes > Privacidad y seguridad > Cámara** y asegúrate de que tu aplicación de navegador esté en la lista y habilitada. En Android, ve a **Ajustes > Aplicaciones > [tu navegador] > Permisos** y permite la Cámara.

    **Verifica que estás en HTTPS o localhost:**
    Los navegadores solo permiten el acceso a la cámara en un contexto seguro. Si la URL en tu barra de direcciones comienza por `http://` (no `https://`), el propio navegador bloquea el acceso a la cámara. Usa la versión `https://` de la URL, o accede a la aplicación en `localhost` durante pruebas locales.

    <Warning>
      Aunque hayas permitido la cámara anteriormente, algunos navegadores restablecen los permisos cuando borras los datos del sitio o cambias a una ventana de navegación privada.
    </Warning>

  </Accordion>

  <Accordion title="El indicador 'Cargando modelo' que nunca desaparece">
    La primera vez que abres ALPR Vue, la aplicación descarga los archivos de modelo de IA ONNX (varios megabytes). En una conexión lenta esto puede tardar uno o dos minutos antes de que el indicador desaparezca.

    **Espera y vuelve a intentarlo:**
    Dale un momento y recarga la página. En la mayoría de conexiones los modelos se cargan en 10–30 segundos. Una vez almacenados en caché por tu navegador, las cargas posteriores son casi instantáneas.

    **Comprueba si hay extensiones que bloqueen WebAssembly:**
    Las extensiones del navegador orientadas a la seguridad (bloqueadores de anuncios, bloqueadores de scripts o extensiones con CSP estricta) pueden impedir que WebAssembly se ejecute. Intenta deshabilitar las extensiones una a una, o abre la aplicación en una ventana privada nueva con las extensiones deshabilitadas.

    **Comprueba la consola del navegador:**
    Pulsa **F12**, abre la pestaña **Consola** y busca mensajes de error en rojo. Un error `Failed to fetch` o `WebAssembly` apunta a un problema de red o de compatibilidad del navegador.

    <Note>
      Los archivos del modelo los almacena en caché tu navegador tras la primera carga exitosa. Si el indicador apareció una vez pero la aplicación funcionó en tu siguiente visita, no es necesario hacer nada más.
    </Note>

  </Accordion>

  <Accordion title="No se detectan matrículas">
    Si la cámara inicia y el escaneo parece activo, pero no aparecen matrículas en tu historial, pueden ser responsables varios factores.

    **Mejora la visibilidad y la iluminación:**
    Asegúrate de que la matrícula sea claramente visible en el encuadre, esté bien iluminada y no esté borrosa. El modelo lee mejor las matrículas bajo una iluminación constante — evita disparar directamente hacia la luz solar brillante o en condiciones muy oscuras.

    **Mantén la cámara estable:**
    La aplicación requiere que la misma matrícula se detecte de forma continua durante al menos 3 segundos antes de guardarla en el historial. Si la cámara se mueve demasiado, la matrícula puede no permanecer en el encuadre el tiempo suficiente para confirmarse.

    **Baja el Umbral de confianza:**
    Abre **Ajustes** (icono de engranaje en el encabezado) y baja el **Umbral de confianza** desde su valor predeterminado de 0,7. Probar con un valor de 0,6 o 0,5 puede permitir que pasen detecciones más marginales.

    **Ten en cuenta las limitaciones regionales:**
    Los modelos de IA están optimizados para matrículas europeas. Las matrículas de otras regiones pueden detectarse con menor precisión o no detectarse en absoluto. Consulta [cómo funcionan los modelos de IA](/es/how-it-works) para más detalles.

    **Intenta cargar una foto:**
    Si la detección con cámara en vivo no funciona, intenta usar el botón **Cargar archivo** para procesar una imagen fija de la matrícula. Esto descarta problemas relacionados con la cámara y da al modelo más tiempo de procesamiento por fotograma. Consulta [cargar archivos](/es/upload-files) para obtener instrucciones.

    <Tip>
      Una vista frontal directa de la matrícula a corta distancia proporciona los mejores resultados de detección. Los ángulos extremos, las matrículas mojadas por la lluvia o las obstrucciones parciales reducen significativamente la precisión.
    </Tip>

  </Accordion>

  <Accordion title="Se detectan matrículas pero el texto es incorrecto o ilegible">
    El modelo OCR lee los caracteres uno a uno y asigna una puntuación de confianza a cada uno. Las matrículas con poco contraste, sucias o parcialmente cubiertas suelen dar lugar a uno o más caracteres mal leídos.

    **Edita el texto de la matrícula manualmente:**
    Toca cualquier matrícula en tu historial para abrir su vista detallada y luego toca **Editar** para corregir los caracteres mal leídos. Tu corrección se guarda de inmediato.

    **Lee las barras de confianza:**
    En la vista detallada de la matrícula, cada carácter tiene su propia barra de confianza. Los caracteres mostrados en rojo tienen baja confianza y son los más propensos a ser incorrectos — enfoca tu revisión ahí.

    **Mejora la imagen de origen:**
    Si la precisión es sistemáticamente mala, intenta capturar la matrícula con mejor iluminación, a menor distancia y con un ángulo más directo. Incluso una ligera inclinación puede hacer que el modelo OCR lea mal un carácter.

    <Note>
      Algunos errores de OCR son de esperar, especialmente para matrículas con poco contraste, sucias o deterioradas. La edición manual es la forma prevista de corregirlos.
    </Note>

  </Accordion>

  <Accordion title="Rendimiento deficiente — la aplicación es lenta o va a saltos">
    ALPR Vue ejecuta dos modelos de IA de forma local, lo que requiere un uso intensivo de CPU y GPU. El rendimiento depende en gran medida de la capacidad de procesamiento de tu dispositivo.

    **Libera recursos del dispositivo:**
    Cierra otras pestañas del navegador, aplicaciones en segundo plano y cualquier otro proceso intensivo en memoria. Cuantos más recursos pueda dedicar tu dispositivo a la aplicación, mejor.

    **Dale un momento para arrancar:**
    La aplicación ejecuta la inferencia de IA en un hilo Web Worker en segundo plano para que la interfaz permanezca receptiva. En la primera detección tras abrir la aplicación puede haber un breve retraso mientras los modelos se inicializan — esto es normal y mejora tras los primeros fotogramas.

    **Usa un navegador compatible:**
    Chrome y Edge generalmente ofrecen el mejor rendimiento de WebAssembly. Si usas un navegador diferente y experimentas lentitud, intenta cambiar. Consulta [requisitos del navegador](/es/browser-requirements) para la lista completa de compatibilidad.

    **Comprende las limitaciones del dispositivo:**
    En dispositivos más antiguos o de menor potencia — especialmente smartphones de gama baja — los modelos pueden ejecutarse lentamente independientemente de las optimizaciones. En este caso, considera usar el modo **Cargar archivo** en lugar de la cámara en vivo, que procesa cada fotograma a su propio ritmo sin una restricción de tiempo real.

  </Accordion>

  <Accordion title="El CSV exportado está vacío o faltan matrículas">
    El botón **Exportar CSV** exporta únicamente las matrículas que se muestran actualmente en tu historial.

    **Asegúrate de que las detecciones fueron confirmadas:**
    Una matrícula debe detectarse de forma continua durante toda la ventana de confirmación (3 segundos por defecto, o 1 segundo para detecciones de alta confianza) antes de guardarse en el historial. Las matrículas que aparecen brevemente en pantalla pero no se confirmaron no aparecerán en la lista ni en la exportación.

    **Comprueba el historial:**
    Desplázate por el panel **Matrículas detectadas** para confirmar que las matrículas que esperas están en la lista. Si la lista está vacía, no se ha confirmado ninguna matrícula en la sesión actual.

    **Vuelve a ejecutar la detección si es necesario:**
    Si borraste el historial antes de exportar, toca **Borrar** en el panel del historial y ejecuta otra sesión de detección. Una vez que las matrículas aparezcan en la lista, usa **Exportar CSV** para descargarlas.

    Consulta [exportar datos](/es/exporting-data) para obtener detalles completos sobre el formato CSV y el contenido de cada columna.

  </Accordion>

  <Accordion title="Los ajustes no se guardan entre sesiones">
    ALPR Vue guarda tus ajustes automáticamente en el `localStorage` de tu navegador. Si los ajustes parecen restablecerse cada vez que abres la aplicación, es probable que se deba a una de las siguientes causas.

    **Evita el modo privado o incógnito:**
    La mayoría de navegadores impiden las escrituras en `localStorage` en el modo de navegación privada, lo que significa que los ajustes se pierden cuando cierras la pestaña. Cambia a una ventana normal del navegador para que los ajustes persistan entre sesiones.

    **Comprueba los permisos de almacenamiento del navegador:**
    Algunos navegadores o extensiones bloquean las escrituras en `localStorage`, especialmente en modos de privacidad estricta o de bloqueo de cookies. Comprueba la configuración del sitio de tu navegador y asegúrate de que el almacenamiento no está bloqueado para este sitio.

    **No borres los datos del sitio entre visitas:**
    Borrar los datos del sitio de tu navegador (cookies, caché, almacenamiento) elimina los ajustes guardados. Si usas una extensión del navegador que borra automáticamente los datos del sitio, añade una excepción para el sitio de ALPR Vue.

    <Note>
      Los ajustes se almacenan localmente en tu navegador, no en ninguna cuenta en la nube. No se comparten entre dispositivos ni perfiles del navegador.
    </Note>

  </Accordion>
</AccordionGroup>
