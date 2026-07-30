# CLAUDE.md
## Proyecto LiberaGo
Conecta a personas que no quieren o no pueden hacer un trámite, fila o mandado
tedioso (revisión técnica, fila de concierto, comprar un repuesto, etc.) con un
trabajador que lo hace por ellas a cambio de pago.
URL producción [https...] (dejar vacío hasta el deploy día 1, luego llenar)
### Fase 0 — antes de escribir código (no borrar, es el criterio de alcance)
1. ¿Qué problema resuelve? Conectar a alguien que no quiere/puede hacer un
   trámite, fila o mandado con un trabajador que lo hace por él, a cambio de pago.
2. ¿Quién lo usa? Cualquier persona dispuesta a pagar para evitarse la tarea
   (sin perfil demográfico único — el filtro es "tengo plata, no tengo ganas/tiempo").
3. ¿Cuál es la primera cosa visible que demuestra que funciona? Un cliente crea
   una solicitud de un tipo de servicio y un trabajador la ve (en tiempo real)
   y la acepta. Sin admin, sin pago en la app todavía — eso es lo único que
   apunta a deployar el día 1.
Si una feature nueva no acerca esta primera cosa visible, va a la lista de
después (abajo), no al código.
## Arquitectura de roles
Una sola app web (React), con rutas protegidas por rol: `/cliente`, `/trabajador`,
`/admin`. No son 3 proyectos separados — un solo repo, un solo deploy. Menos
mantenimiento para un solo dev en el arranque; se puede separar después si duele.
## Stack
| Pieza | Elección | Porqué |
|---|---|---|
| Frontend | React + Vite + TailwindCSS | Arranque rápido, HMR, cero config |
| Backend | Express + TypeScript, serverless (Vercel functions) | Un solo `api/index.ts`, escala sola, sin servidor que mantener |
| Auth/DB | Supabase (Postgres + Auth + Realtime) | Auth con roles + DB + **Realtime** en un solo proveedor — el trabajador necesita ver solicitudes nuevas al instante sin refrescar |
| Deploy | Vercel | Push a master = deploy; previews por rama |
| Pagos | Ninguno en el MVP | El día 1 no cobra en la app — el pago se coordina fuera. Se agrega pasarela (MercadoPago) después de validar el flujo pedido→aceptación |
| IA | No aplica por ahora | — |
Decisiones de runtime tomadas ANTES de codear
- ¿Dónde corre en producción? Serverless (Vercel functions) → nada de Chrome
  headless, nada de filesystem persistente, nada de procesos largos o
  websockets propios en el backend. El realtime lo resuelve Supabase Realtime
  (websocket gestionado por Supabase, no por nuestra función serverless).
- ¿Genera artefactos pesados (PDF, imágenes, video)? No en el MVP. Si aparece
  más adelante (ej. comprobante de trámite), se genera en el cliente.
## Comandos reales
```
[comando dev — un solo comando que levanta todo]
[comando build]
[comando test]
[comando deploy, si es manual]
```
## Estructura de carpetas
```
[árbol real del proyecto con una línea de explicación por carpeta]
```
## Convenciones
- Idioma del copy [español neutro  etc.]
- Estilo de commits [convencional — feat, fix, docs, chore]
- [otras convenciones del equipo]
## Variables de entorno requeridas
```
[LISTA_VAR_1]   # qué es, dónde se consigue
[LISTA_VAR_2]
```
Validadas al boot trim, limpiar BOM, rechazar si contiene `r`, `n` o el
texto literal `rn` pegado desde un dashboard — fail-fast con mensaje claro,
no un error críptico downstream.
## Reglas generales
1. Leer archivos antes de escribir código.
2. Preferir edición sobre reescritura completa.
3. Sin comentarios obvios; solo cuando el WHY no es evidente.
4. Soluciones simples y directas, sin abstracciones prematuras. Un
   controller, un service, un archivo — hasta que duela. Cuando un archivo
   pase de ~400-500 líneas o una segunda feature aterrice ahí, dividir.
5. Trabajar de forma ordenada para gastar pocos tokens leer → editar →
   commit.
6. Cada bug de producción deja un test de regresión (no test-first
   dogmático — candados donde ya dolió).
7. Cada gotcha descubierto va a este archivo el mismo día, con commit `docs`.
8. Scripts de debug van a `scratch` (gitignoreado) o se borran — no viven en
   la raíz del repo.
9. Al abandonar un enfoque técnico, desinstalar sus dependencias en el mismo
   commit.
10. Nunca hacer pushdeploy a producción sin avisar antes. Antes de subir,
    dar la URL de pruebas (previewstaging) del cambio y esperar mi OK
    explícito. No asumir aprobación por silencio ni por aprobaciones
    anteriores de otros cambios.
## App Android (APK descargable) [si aplica — borrar sección si no hay app móvil]
[Completar cuando se decida empaquetar el frontend como APK, ej. con
Capacitor. Documentar acá, siguiendo el patrón de Ergania]
- Herramienta usada [ej. Capacitor] — `[carpeta]android`.
- ¿El APK carga la app en vivo (`server.url`) o empaqueta el build compilado
  adentro Esto determina si hay que recompilar el APK cada vez que cambia
  el frontend en producción, o si se actualiza solo.
- Dónde vive el archivo descargable y qué botónpágina lo sirve.
- De dónde sale la versión que ve el usuario (constante manual vs. calculada)
  y en qué archivos hay que sincronizarla (ej. constante de frontend,
  `versionCode``versionName` de Android, endpoint de backend que informa la
  última versión disponible).
- Procedimiento paso a paso para generar y subir un build nuevo (build
  firmado — dónde están las credencialeskeystore, comando de build,
  dónde se sube el resultado).
- Regla después de cada push a producción que toque el frontend, avisar
  si corresponde recompilar y resubir el APK (o hacerlo, si el proyecto lo
  automatiza) — para que la versión instalada no quede desactualizada
  respecto a la web.
## Gotchas
[Vacío al día 1 — este es el espacio para anotar, apenas aparezcan, cosas
como env vars escopeadas por rama en el hosting, comportamientos raros de
alguna librería, límites del runtime serverless, etc. Formato qué pasó, por
qué, cómo evitarlodetectarlo.]
## Backlog  después
- [Ideas descartadas para ahora con motivo — evita reabrir sin evidencia
  nueva]
## Checklist de salida del arranque
- [ ] Problema, usuario y primera cosa visible escritos arriba.
- [ ] `git init` fue antes que el código; primer commit revisado archivo por
      archivo, sin datos personales ni binarios.
- [ ] `.gitignore` cubre env, builds, logs y carpetas de datosoutputs.
- [ ] Cada elección de stack tiene su porqué; decisiones de runtime,
      proveedor de IA y artefactos pesados tomadas ANTES de codear.
- [ ] Un solo comando levanta todo el entorno de desarrollo.
- [ ] Env vars validadas al boot trim, BOM, `rn`, fail-fast con mensaje
      claro.
- [ ] Hay una URL de producción viva con al menos un hola — deploy día 1.
- [ ] El flujo rama → PR → deploy funciona y se usó al menos una vez.
- [ ] Cero capas especulativas; cero dependencias instaladas por si acaso.