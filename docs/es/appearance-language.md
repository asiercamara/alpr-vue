---
title: 'Preferencias de Tema e Idioma'
description: 'Cómo cambiar entre los modos de tema claro, oscuro y del sistema y cambiar el idioma de la interfaz en ALPR Vue, con efecto inmediato y sin necesidad de recargar la página.'
---

Los ajustes de apariencia e idioma controlan cómo se ve ALPR Vue y en qué idioma se muestra. Puedes elegir un tema de color que se adapte a tu entorno o a tu dispositivo, y puedes cambiar el idioma de la interfaz en cualquier momento. Ambos ajustes surten efecto de inmediato — no es necesario recargar la página. Abre el **panel de ajustes** (icono de engranaje en el encabezado) para acceder a ellos.

## Tema

ALPR Vue ofrece tres modos de tema. Selecciona el que mejor se adapte a tu entorno de trabajo.

| Modo        | Qué hace                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------- |
| **Claro**   | Siempre usa la interfaz en modo claro, independientemente de la configuración de tu dispositivo.  |
| **Oscuro**  | Siempre usa la interfaz en modo oscuro, independientemente de la configuración de tu dispositivo. |
| **Sistema** | Sigue automáticamente la preferencia de tu dispositivo o sistema operativo.                       |

El predeterminado es **Sistema**.

<Tip>
  El tema Sistema es el recomendado para la mayoría de usuarios. Cuando tu dispositivo cambia entre modo claro y oscuro — por ejemplo, al atardecer según un horario automático — ALPR Vue cambia con él, por lo que nunca tendrás que ajustarlo manualmente.
</Tip>

### Prevención del destello de contenido sin estilo

ALPR Vue aplica tu elección de tema antes de que la página termine de renderizarse. Esto significa que nunca verás un destello blanco al cargar la aplicación en modo oscuro — los colores correctos están en su lugar desde el primer fotograma.

## Idioma

ALPR Vue admite tres opciones de idioma.

| Opción           | Qué hace                                                                      |
| ---------------- | ----------------------------------------------------------------------------- |
| **Auto**         | Detecta tu idioma preferido según la configuración de idioma de tu navegador. |
| **Inglés (EN)**  | Muestra siempre la interfaz en inglés.                                        |
| **Español (ES)** | Muestra siempre la interfaz en español.                                       |

El predeterminado es **Auto**.

El cambio de idioma surte efecto inmediatamente en toda la interfaz — botones, etiquetas, notificaciones y descripciones de ajustes se actualizan todos a la vez.

<Note>
  La opción Auto lee la preferencia de idioma de tu navegador (el ajuste `Accept-Language`). Si tu navegador está configurado en español, ALPR Vue usará español automáticamente. Si tu navegador reporta un idioma distinto del inglés o el español, la aplicación recurre al inglés.
</Note>
