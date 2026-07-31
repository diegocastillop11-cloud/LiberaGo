# Design System — LiberaGo

## Product Context
- **Qué es:** Marketplace de trámites y mandados — el cliente pide, un trabajador verificado lo hace por él, con seguimiento en vivo.
- **Para quién:** cualquiera con plata y sin ganas/tiempo para hacer la tarea.
- **Espacio/referentes:** TaskRabbit, Uber, Mercado Pago (research visual en la sesión de /design-consultation).
- **Tipo de proyecto:** app web mobile-first (React), con landing de marketing + app por rol (`/cliente`, `/trabajador`, `/admin`).
- **La cosa memorable:** confianza y seriedad — "le puedo confiar mi trámite a un desconocido y va a salir bien".

## Aesthetic Direction
- **Dirección:** minimalismo confiado con fondo de marca — tipografía y espacio hacen el trabajo, cero decoración de relleno, fotografía real (nunca ilustración) para momentos de confianza.
- **Nivel de decoración:** mínimo.
- **Mood:** cálido pero serio — como un documento impreso de confianza, no como un dashboard de startup genérico.
- **Iteración de color:** partió en tinta oscura + un acento; el usuario pidió fondo amarillo miel vivido-pero-suave con azul en los botones. El negro puro sobre amarillo se sentía "cinta de peligro" — se resolvió con texto espresso (misma familia cálida que el fondo). El timeline/tabla se sentían "demasiado amarillo" sin superficie — se resolvió envolviendo contenido en tarjetas blancas, igual que ya funcionaba en la pantalla del trabajador.

## Typography
- **Display/Hero:** Fraunces — serif con carácter, se siente como un contrato serio, no un dashboard.
- **Body/UI:** DM Sans — legible, profesional, sin ser el Inter de siempre.
- **Datos/Tablas:** Geist con `font-variant-numeric: tabular-nums`.
- **Carga:** Google Fonts (`Fraunces`, `DM Sans`, `Geist`).
- **Escala:** H1 44-64px / H2 28-32px / H3 20px / body 16-17px / small 13-14px / micro 11-12px.

## Color
- **Enfoque:** restringido — fondo de marca + dos acentos con roles fijos, nunca de adorno.
- **Fondo (miel):** `#EFCB6E` — vívido pero suave, persistente en toda la app.
- **Superficie:** `#FFFCF5` (tarjetas — todo contenido denso o de datos debe vivir sobre superficie, nunca directo sobre el fondo miel).
- **Superficie secundaria:** `#F6DFA0`.
- **Texto:** `#10202D` — negro con matiz azul (mismo hue que el acento azul, ~207°). El fondo miel tiene hue ~43°; su complementario cae en ~223°, casi exactamente donde está nuestro azul. Café-sobre-miel era armonía análoga (tonos vecinos) y se sentía turbio; negro-azulado-sobre-miel es armonía complementaria — más nítido, y de paso monocromático con los botones.
- **Texto secundario:** `#7C6947`.
- **Borde:** `#E0C077`.
- **Azul (acción — botones, "en curso"):** `#2C5F8A` / texto sobre azul `#FFFFFF`.
- **Mostaza (confirmado — verificado, pasos completados):** `#A8761C` / texto sobre mostaza `#FFFCF5`.
- **Éxito:** `#2F7A4F` · **Advertencia:** `#A8551C` · **Error:** `#B3432B` · **Info:** `#2C5F8A`.
- **Regla de oro:** el azul es exclusivo de la acción; el mostaza es exclusivo de lo ya confirmado. No se intercambian.
- **Modo oscuro:** fondo `#221C10`, superficie `#2E2717`, texto `#F5EFDD`, azul `#4C86AE`, mostaza `#D9A93B` — misma lógica de roles, saturación ajustada para legibilidad.

## Spacing
- **Base:** 8px.
- **Densidad:** comfortable (touch targets grandes — se usa en terreno); admin puede usar variante compacta en tablas.
- **Escala:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64).

## Layout
- **Enfoque:** grid disciplinado (12 col desktop / 4 col mobile); libertad editorial solo en el hero de landing.
- **Ancho máximo de contenido:** 1180px.
- **Border radius:** sm 6px / md 10px / lg 14px / full (solo pills de estado).

## Motion
- **Enfoque:** funcional e intencional, nunca decorativo — cada animación aclara causa/efecto.
- **Implementación:** CSS puro (transition/@keyframes + IntersectionObserver), no librería JS — menos peso, más control, alineado con las guías de Vercel.
- **Scroll reveal (sutil):** opacity 0→1 + translateY 12px→0, 300-400ms, easing tipo `power1.out` (`cubic-bezier(0.25,0.46,0.45,0.94)`).
- **Stagger de listas:** mismo fade, delay 30-40ms por ítem, máximo ~10 ítems.
- **Hover/estado:** 150-250ms, transform/opacity únicamente (compositor-friendly).
- **Respeta `prefers-reduced-motion`:** siempre.

## Decisions Log
| Fecha | Decisión | Razón |
|---|---|---|
| 2026-07-30 | Sistema inicial: tinta oscura + mostaza/azul | Propuesta base de /design-consultation, research TaskRabbit/Uber/Mercado Pago |
| 2026-07-30 | Pivote a fondo miel + botones azules | Pedido explícito del usuario, con referencia visual (Morfy) |
| 2026-07-30 | Texto espresso en vez de negro puro | Negro+amarillo se leía como cinta de peligro; espresso mantiene contraste sin romper la armonía cálida |
| 2026-07-30 | Timeline y tabla envueltos en tarjeta blanca | Sin superficie, el mostaza se perdía contra el fondo y todo se sentía "demasiado amarillo" |
| 2026-07-30 | Texto principal: café `#5B3915` → negro azulado `#10202D` | El café no convenció al usuario (análogo al fondo = turbio). Un negro con el mismo hue que el acento azul (complementario al fondo, ~223° vs ~207°) da más nitidez y conecta con los botones |
