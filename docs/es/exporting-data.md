---
title: 'Exportar Detecciones de Matrículas a CSV'
description: 'Descarga las matrículas detectadas como un archivo CSV para Excel o Google Sheets. Cada fila incluye el texto de la matrícula, la puntuación de confianza, la marca de tiempo de detección y un ID único.'
---

La función de exportación te permite descargar tu historial completo de detecciones como un archivo CSV con un solo clic. El archivo incluye todas las matrículas que la aplicación ha confirmado durante tu sesión — incluido cualquier texto que hayas editado manualmente — junto con la puntuación de confianza OCR, la hora de detección y un ID único para cada registro. Úsalo para registrar la actividad de vehículos, elaborar informes o analizar patrones en una hoja de cálculo.

## Exportar los datos

<Steps>
  <Step title="Abre el panel del historial de matrículas">
    Asegúrate de tener al menos una detección en la lista **Matrículas detectadas**. El botón de exportación solo aparece cuando hay resultados.
  </Step>
  <Step title="Haz clic en Exportar CSV">
    Haz clic en el botón **Exportar CSV** en la esquina superior derecha del panel del historial.
  </Step>
  <Step title="Guarda el archivo">
    Tu navegador descarga el archivo inmediatamente en tu dispositivo. Comprueba la carpeta de descargas predeterminada de tu navegador si no aparece automáticamente.
  </Step>
</Steps>

## Columnas del CSV

El archivo exportado contiene cuatro columnas:

| Columna        | Descripción                                                                                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Text**       | La cadena de caracteres de la matrícula reconocida. Si editaste el texto en el modal de detalle, aquí se exporta la versión corregida.                         |
| **Confidence** | La confianza OCR media de todos los caracteres de la matrícula, expresada como un decimal entre 0 y 1. Un valor de `0,92` significa un 92% de confianza media. |
| **Date**       | La fecha y hora en que se detectó la matrícula, en formato de marca de tiempo local.                                                                           |
| **ID**         | Un identificador único asignado a cada registro de detección. Útil si necesitas cruzar entradas entre varias exportaciones o sistemas.                         |

## Formato del archivo

El archivo CSV está codificado en **UTF-8** y usa comas como delimitador. Las comas o comillas dobles en el texto de la matrícula se escapan correctamente para que el archivo se abra bien en Excel y otras herramientas. El archivo se descarga inmediatamente en tu dispositivo — no se envía nada a ningún servidor.

## Ejemplo de salida

```csv
Text,Confidence,Date,ID
ABC1234,0.92,2024-01-15T10:23:45.000Z,a1b2c3d4
XYZ5678,0.87,2024-01-15T10:24:12.000Z,e5f6g7h8
```

<Tip>
  Abre el CSV en Excel o Google Sheets para ordenar por confianza, filtrar por rango de fechas o crear gráficos con tus datos de detección. En Google Sheets, ve a **Archivo → Importar** y selecciona el archivo descargado.
</Tip>
