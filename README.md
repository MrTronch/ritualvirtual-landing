# Ritual Virtual — primera versión

Landing estática lista para un servidor local y GitHub Pages. Los assets originales se conservan sin cambios. El video utilizado es `vid ritual virtual.mp4` (el archivo existente de 9 MB).

## Previsualizar

En Windows, abre **ABRIR-PREVIEW.cmd**. Requiere Python (ya instalado en este equipo). El acceso inicia el servidor en segundo plano si hace falta, espera a que responda y abre http://localhost:4173 en tu navegador predeterminado. Si ya está funcionando, lo reutiliza.

El GLB y los módulos necesitan HTTP. Si abres `index.html` con doble clic, intenta llevarte automáticamente a la vista previa local. Si el servidor no está iniciado, muestra el enlace y la indicación de ejecutar `ABRIR-PREVIEW.cmd`.

## Publicar después en GitHub Pages

1. Sube el contenido de esta carpeta al repositorio, respetando nombres y subcarpetas; no se requiere compilación.
2. En Settings → Pages elige Deploy from a branch, la rama `main` y `/ (root)`.
3. Todas las rutas son relativas: también funciona en `usuario.github.io/repositorio/`.

No se ha publicado ni creado un repositorio desde esta demo. Para publicar solo hacen falta `index.html`, `styles.css`, `app.js`, `vendor/`, `logo.png`, el GLB, `texturas psicogato/`, el MP4 y `.nojekyll`.

## Edición

- Textos y cinco enlaces: `index.html`.
- Colores, tamaños, espaciado y responsive: `styles.css`.
- Seguimiento del mouse/touch, iluminación, expresiones, holografía y scroll: `app.js`.
- Para sustituir el video conserva su nombre o actualiza `data-src` y los enlaces al MP4 en `index.html`.

El video se carga cerca de su sección, se reproduce sin sonido y se pausa fuera de vista. Un tap o clic sobre el video alterna reproducción y pausa; también admite Enter y Espacio. El video permanece sin sonido y no muestra controles superpuestos. El 3D deja de renderizar fuera de pantalla o cuando la pestaña está oculta. La preferencia de movimiento reducido desactiva el movimiento y la reproducción automática. El visor no muestra controles. El header permanece visible al hacer scroll y los textos aparecen progresivamente.

La transición del reel deforma su contorno y orientación con el scroll, manteniendo la reproducción nativa del video para reducir el costo en móvil. No es una simulación física de tela.

Three.js 0.180.0 se incluye localmente en `vendor/`, bajo licencia MIT (`vendor/LICENSE`). No hay dependencias de CDN ni instalación de paquetes para usar la página.
