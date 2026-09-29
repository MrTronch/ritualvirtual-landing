# Verificación de la demo

Fecha: 29 de septiembre de 2026.

Probada en Microsoft Edge automatizado: escritorio 1440 × 1000, móvil emulado 390 × 844 con entrada táctil y pantalla 320 × 780 con movimiento reducido. Se revisaron visualmente las capturas de escritorio y móvil. No constituye una prueba en dispositivos físicos ni en Safari/iOS.

- Modelo GLB y cuatro texturas de expresión cargados, sin errores de JavaScript ni solicitudes fallidas.
- Cabeza encuadrada de frente, siguiendo mouse y touch con límites y suavizado. En touch se comprobó una rotación horizontal de 0,226 rad y retorno a 0,0015 rad al soltar.
- Cambios de ojo-1 a ojo-2 y vuelta observados; parpadeos de aproximadamente 117–167 ms. Boca-2 observada y retorno a boca-1. Doble parpadeo ocasional programado con probabilidad del 19%, sin encadenar un tercero.
- Video original: 43,071 s, 576 × 1024, 9.485.602 bytes. Reproducción, pausa y sonido comprobados. Carga diferida según proximidad de la sección.
- Deformación del contorno ligada al scroll comprobada.
- Los cinco enlaces coinciden exactamente con los proporcionados; redes en orden Instagram, TikTok, YouTube. No se verificó acceso privado a los PDF de Drive.
- Sin desbordamiento horizontal en las tres dimensiones probadas.
- Animación pausada mediante el control del visor; render suspendido fuera de pantalla.
- Con movimiento reducido: animaciones y autoplay desactivados, reproducción manual disponible.
- JavaScript validado sintácticamente. Todas las dependencias y rutas de assets son locales y relativas.

La previsualización funciona mediante HTTP. La publicación en GitHub Pages queda pendiente, según lo solicitado. Ver README.md.

## Revisión 2 — plantilla y controles simplificados

Probada en 1440, 390 y 320 px de ancho: header visible en top=0 durante el scroll; sin desbordamiento; cartas con iconos, subtítulos y flechas verdes; textos revelados al entrar; sin botones superpuestos. Tap/clic pausa, conserva la pausa al desplazar y vuelve a reproducir al tocar otra vez. Sin errores JavaScript. Se retiraron los controles de sonido y pausa del visor de la versión anterior. Video confirmado también en la vista previa integrada.

## Revisión 3 — apertura local y animación

El archivo abierto con file:// no puede cargar módulos/GLB mediante fetch en Chrome. Se añadió una detección previa que muestra instrucciones y redirige a localhost si responde el logo. El lanzador espera a que el servidor responda antes de abrir el navegador. Se verificó en la vista previa integrada la carga correcta del GLB y el shader acuático reforzado. El título activa headline-arrive con un desfase de 0,18 s entre líneas al entrar en pantalla. Chrome no estaba disponible en la conexión de automatización de esta sesión; la causa se identificó en la URL de la captura del usuario.
