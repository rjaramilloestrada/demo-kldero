# Demo Kldero Steak Club

Demo de diseño (landing de una sola página) preparado por IGNIS para Kldero Steak Club, parrilla uruguaya en Guayaquil (@kldero.ec), con promos, carta, tres locales, shows en vivo, reservas y pedidos por WhatsApp. Las imágenes son ilustraciones referenciales; irán las fotos originales de Kldero.

**URL:** https://rjaramilloestrada.github.io/demo-kldero/

Sigue el estándar de demo web IGNIS: sitio estático, mobile first, `noindex, nofollow, noarchive`, banner de demo con `role="note"`, contenido separado del diseño en `data.json`, movimiento con GSAP (apagado con `prefers-reduced-motion`), medición con IDs vacíos y pedido armado a WhatsApp.

## Estructura

```
index.html          Esqueleto semántico (secciones, símbolos SVG, cajón del pedido)
styles.css          Diseño (tokens de marca arriba, un bloque por sección)
app.js              Carga data.json, dibuja todo, carrito, reservas, medición y movimiento
data.json           Todo el contenido: negocio, WhatsApp, promos, carta, locales, horario, show, FAQ, medición
vendor/             GSAP, ScrollTrigger, SplitText y Lenis (sin build, sin npm)
assets/             favicon.svg y promos.svg (ilustraciones de las promos)
og.jpg              Vista previa social 1200 x 630
.github/workflows/  Publicación en GitHub Pages
```

Para verlo en local hace falta un servidor (la página lee `data.json`):

```
python3 -m http.server 8765
```

## Orden de la página (estándar sección 3)

0 banner de demo · 1 hero · 2 atajos (Menú, Promos, Locales, Reservar) · 3 pieza interactiva: escena Crudo, Sellado, Servido (scroll) y armador de pedido con promos y carrito a WhatsApp · 4 carta por categoría · 5 cobertura: locales con estado abierto o cerrado por hora de Guayaquil, shows y agenda, cómo pedir · 6 confianza (solo lo que dice Kldero) · 7 galería con espacios reservados marcados · 8 preguntas frecuentes · 9 reserva a WhatsApp · 10 pie con Instagram y TikTok.

## Honestidad de datos

- `carta.estado` es `provisional` (se muestra el sello "Carta provisional"). "Limonada" y "Porción de morocho" llevan `estado: por_confirmar` y se marcan en la carta.
- Plaza Guayarte tiene `horario_estado: por_confirmar`: no muestra abierto o cerrado, solo el aviso.
- `envio.precio` es `null`: se muestra "Envío: por confirmar por WhatsApp".
- `pedidosya.estado` es `por_confirmar`.
- Una pregunta frecuente con `respuesta: null` no se muestra.
- Colores de marca con `colores_estado: aproximado`.

## Medición

`data.json > medicion` trae `meta_pixel_id` y `ga4_id` vacíos. Sin IDs no se carga ningún script. Con IDs, `app.js` inyecta Meta Pixel y GA4 y reporta `whatsapp_click`, `add_to_cart`, `order_send` y `reservation_send`.

## Activar GitHub Pages

El workflow `.github/workflows/pages.yml` publica en cada push a `main` copiando `index.html`, `styles.css`, `app.js`, `data.json`, `og.jpg`, `vendor/` y `assets/`. En Settings › Pages, fuente "GitHub Actions".

## Pendientes por validar con Kldero

- Dos líneas de WhatsApp: 099 798 6596 (pedidos, la que usa el demo) y 099 468 7035 (carta). Confirmar cuál va en cada botón.
- Precios: son provisionales, tomados del menú publicado en Instagram. Falta la carta oficial.
- Nombres dudosos en la carta: "Limonada" y "Porción de morocho".
- Enlace real de PedidosYa (ahora apunta a la página principal de PedidosYa Ecuador).
- Horario de Plaza Guayarte (el demo muestra el horario general como referencia y lo marca por confirmar).
- Costo de envío a domicilio (hoy se dice que se confirma por WhatsApp).
- Canal de reservas y persona de contacto (hoy las solicitudes llegan al WhatsApp de pedidos).
- Colores y logo definitivos (los colores son aproximados).
- Fotos originales y autorización para la galería (hoy son espacios reservados).
- Revisión de `data.json` contra el análisis del lead por un agente aparte (checklist del estándar, sección 6).

## Nota para la reunión

El pie de página incluye un simulador de día ("Hoy", "Un martes", "Un sábado", marcado como solo del demo) para mostrar el banner de Martes loco y el estado de los locales. Se quita en la versión entregada.
