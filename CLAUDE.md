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

**Modelo de roles (desde 2026-07-31, con Supabase Auth + Google):**
- `cliente` no es un rol exclusivo — cualquier usuario logueado puede pedir
  servicios.
- `trabajador` es un estado (`profiles.worker_status`) que se solicita
  (`request_worker_status()`) y un admin aprueba/rechaza
  (`set_worker_status()`, ambas son funciones RPC `security definer`).
- `admin` (`profiles.is_admin`) nunca se auto-asigna — se activa a mano por
  SQL directo en Supabase después del primer login de esa persona.
- Login: Google OAuth vía Supabase Auth (`supabase.auth.signInWithOAuth`).
  Requiere credenciales de Google Cloud Console configuradas en Supabase
  Dashboard → Authentication → Providers → Google (fuera del repo, lo hace
  el usuario directo en los dashboards — ver CLAUDE.md § Gotchas para la
  guía).
## Stack
| Pieza | Elección | Porqué |
|---|---|---|
| Frontend | React + Vite + TailwindCSS | Arranque rápido, HMR, cero config |
| Backend | Express + TypeScript, serverless (Vercel functions) | Un solo `api/index.ts`, escala sola, sin servidor que mantener |
| Auth/DB | Supabase (Postgres + Auth + Realtime) | Auth con roles + DB + **Realtime** en un solo proveedor — el trabajador necesita ver solicitudes nuevas al instante sin refrescar |
| Deploy | Vercel | Push a master = deploy; previews por rama |
| Pagos | MercadoPago (Checkout Pro) | El cliente paga al crear la solicitud, antes de que un trabajador la vea — encaja con el reembolso del 50% de los T&C para "no completado". Igual patrón que Ergania: fetch directo a la API de MP, sin SDK. Agregado 2026-08-01, después de validar el flujo pedido→aceptación sin pago |
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
npm run dev         # vercel dev — levanta frontend + funciones /api juntos (requiere `vercel login` una vez)
npm run build        # tsc -b && vite build
npm run typecheck    # tsc -b --noEmit
npm run test          # vitest run
```
Deploy es automático: push a una rama → preview en Vercel; push/merge a `master`
→ producción (con OK explícito antes, ver Reglas generales #10).
## Estructura de carpetas
```
api/
  index.ts        # Express app como función serverless (Vercel) — todo /api/* pasa por acá (ver vercel.json)
  _lib/           # prefijo _ a propósito: ver Gotchas — evita que Vercel los cuente como funciones
    env.ts        # validación fail-fast de env vars del backend
    supabase.ts   # cliente Supabase con service_role key (solo backend)
  _routes/        # routers de Express montados desde index.ts (mismo motivo del prefijo _)
src/
  main.tsx        # entry point, valida env del frontend al cargar
  App.tsx         # rutas por rol: /cliente, /trabajador, /admin
  lib/
    env.ts          # validación fail-fast de env vars del frontend (VITE_*)
    validateEnv.ts  # validador compartido (trim, BOM, \r\n) usado por frontend y backend
    supabase.ts      # cliente Supabase con anon key (frontend)
  index.css        # entrada de Tailwind
vercel.json       # rewrite /api/* → api/index.ts (necesario porque Express hace su propio ruteo interno)
```
## Convenciones
- Idioma del copy: español neutro (Chile).
- Estilo de commits: convencional — `feat:`, `fix:`, `docs:`, `chore:`.
- Roles de usuario: `cliente`, `trabajador`, `admin` — una sola app, rutas por rol.
## Variables de entorno requeridas
```
VITE_SUPABASE_URL             # Project URL — Supabase dashboard > Settings > API
VITE_SUPABASE_ANON_KEY        # anon public key — Supabase dashboard > Settings > API
SUPABASE_URL                  # mismo valor que VITE_SUPABASE_URL, usado en el backend
SUPABASE_SERVICE_ROLE_KEY     # service_role key (secreta) — Supabase dashboard > Settings > API, solo backend
```
Validadas al boot (`src/lib/validateEnv.ts`, usado por `src/lib/env.ts` y
`api/_lib/env.ts`): trim, limpiar BOM, rechazar si contiene `\r` o `\n` —
fail-fast con mensaje claro, no un error críptico downstream.
En Vercel, las env vars de **preview están escopeadas por rama** — cada rama
nueva sale "en negro" hasta agregarlas a mano para esa rama en Project
Settings > Environment Variables.

### Variables opcionales — notificaciones push + despacho secuencial (2026-08-01)
Sin estas, la app funciona igual que antes (nadie se rompe) — solo no se
activa el push ni el salto automático de 10s entre trabajadores.
```
VAPID_PUBLIC_KEY / VITE_VAPID_PUBLIC_KEY   # mismo valor, par de llaves autogenerado (web-push), no requiere cuenta
VAPID_PRIVATE_KEY                          # secreta, solo backend
WEBHOOK_SECRET                             # secreto compartido para el Database Webhook de Supabase (ver abajo)
QSTASH_TOKEN                               # cuenta gratis en upstash.com > QStash
QSTASH_CURRENT_SIGNING_KEY / QSTASH_NEXT_SIGNING_KEY  # idem, para verificar la firma del callback
```
Falta además crear a mano en Supabase Dashboard → Database → Webhooks un
webhook `INSERT` sobre `requests` que llame a
`https://<dominio>/api/webhooks/request-created` con el header
`x-liberago-webhook-secret: <WEBHOOK_SECRET>`.

### Variables requeridas — pagos con MercadoPago (2026-08-01)
Sin `MERCADOPAGO_ACCESS_TOKEN` el checkout falla al crear la solicitud (error
explícito, no silencioso) — a diferencia de las opcionales de arriba, esto sí
bloquea el flujo cliente→trabajador porque ahora nace pagado.
```
MERCADOPAGO_ACCESS_TOKEN   # secreta, solo backend — MercadoPago > Tu negocio > Configuración > Credenciales
MP_WEBHOOK_SECRET           # secreto para verificar la firma HMAC del webhook de pago — MercadoPago > Tu negocio > Webhooks > (la notificación) > Firma secreta
```
Falta crear a mano en el dashboard de MercadoPago (Tu negocio → Webhooks) una
notificación de tipo `payment` apuntando a
`https://<dominio>/api/webhooks/mercadopago-payment` — MP la firma con
`MP_WEBHOOK_SECRET` una vez creada (no se puede saber el secreto antes de
crearla). Sin `MP_WEBHOOK_SECRET` configurado, el endpoint acepta cualquier
notificación sin verificar firma (fail-open deliberado para poder probar en
preview antes de tener el webhook real armado) — nunca dejar así en
producción.

### Variables requeridas — verificación de identidad con Didit (2026-08-03)
Igual que MercadoPago: sin `DIDIT_API_KEY`/`DIDIT_WORKFLOW_ID` el endpoint de
verificación falla explícito al intentar crear una sesión — bloquea que un
trabajador sea aprobado y que un cliente haga una segunda solicitud (ver
`0016_identity_verification.sql`), pero no bloquea la primera solicitud del
cliente (esa es la "primera cosa visible" de Fase 0, se decidió a propósito
no ponerle fricción).
```
DIDIT_API_KEY              # secreta, solo backend — dashboard de Didit (didit.me) > API Keys
DIDIT_WORKFLOW_ID           # UUID del workflow de verificación configurado en Didit (documento + selfie/liveness)
DIDIT_WEBHOOK_SECRET_KEY    # secreto para verificar la firma HMAC del webhook — dashboard de Didit > Webhook destination
```
Falta crear a mano en el dashboard de Didit un webhook destination apuntando
a `https://<dominio>/api/webhooks/didit-verification`; el `secret_shared_key`
que Didit entrega ahí es `DIDIT_WEBHOOK_SECRET_KEY`. A diferencia del webhook
de MercadoPago (fail-open documentado arriba), este es **fail-closed desde
el día 1**: sin `DIDIT_WEBHOOK_SECRET_KEY` configurado, el endpoint responde
401 en vez de aceptar sin verificar — no repetir el wart de MP acá.

No guardamos el documento de identidad ni el RUN en nuestra base — solo el
veredicto (`profiles.identity_status`) y el id de la sesión de Didit. El
proveedor solo cubre 220+ países de forma genérica; si Didit resulta no
reconocer bien la cédula chilena en la práctica, es la señal para evaluar
otro proveedor (decisión de sesión futura, no bloquea el lanzamiento del
resto de la app).
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
## Gotchas
- **Un trigger `BEFORE UPDATE` sin bypass explícito para `service_role`
  bloquea las actualizaciones hechas por el backend con la service key.**
  Qué pasó: al diseñar el webhook de pago (que necesita mover una solicitud
  de `pendiente_pago` a `solicitado` usando `supabaseAdmin`), se encontró
  que `enforce_requests_update_columns` (0006/0007/0009) solo tenía bypass
  para `public.is_admin()`, que depende de `auth.uid()` — y `auth.uid()` es
  `NULL` para conexiones con la `service_role` key (su JWT no trae claim
  `sub`). Sin bypass, el trigger cae al `raise exception 'No autorizado a
  modificar esta solicitud'` para cualquier UPDATE del backend sobre una
  fila sin `worker_id` propio (exactamente el caso del despacho a
  trabajadores y el de confirmar un pago). Por qué: RLS (`BYPASSRLS` del rol
  `service_role`) y los triggers son mecanismos independientes — bypassear
  RLS no bypassea triggers. Cómo se evitó: 0013 agrega `auth.role() =
  'service_role'` como bypass explícito junto a `is_admin()`. Es seguro
  porque `SUPABASE_SERVICE_ROLE_KEY` nunca llega al frontend (ver env vars
  arriba). Al tocar cualquier trigger de `requests`, verificar que las
  actualizaciones hechas desde `api/` (siempre vía `supabaseAdmin`) sigan
  pasando — no asumir que "ya funciona" solo porque no tira error en el
  cliente (el backend puede estar tragándose el error si no se revisa el
  resultado del `.update()`).
- **`vercel login` con el CLI viejo solo redirige a un changelog, no autentica.**
  Qué pasó: con `vercel@37.x`, elegir "Continue with GitHub" abre
  `vercel.com/api/registration/login-with-github?...`, que Vercel deprecó
  (26 feb 2026) y ahora redirige a `vercel.com/changelog/new-vercel-cli-login-flow`
  en vez de autenticar — parece que "no pasa nada" pero en realidad el flujo
  entero ya no existe. Por qué: Vercel migró a OAuth 2.0 Device Flow y mató
  las URLs del flujo anterior después de la fecha de deprecación. Cómo
  evitarlo: mantener `vercel` en `devDependencies` actualizado
  (`npm view vercel version` para chequear la última) — ya está en `^58.4.4`.
- **Imports relativos en `api/` necesitan extensión `.js` explícita.**
  Qué pasó: `/api/health` devolvía `FUNCTION_INVOCATION_FAILED` en el
  deploy real (`Error [ERR_MODULE_NOT_FOUND]: Cannot find module
  '/var/task/api/lib/env'`) aunque el build y el typecheck pasaban limpios.
  Por qué: `package.json` tiene `"type": "module"` (ESM real), y el runtime
  Node de las funciones serverless de Vercel no bundlea `api/*.ts` en un
  solo archivo — cada import relativo se resuelve con el loader ESM nativo
  de Node, que exige la extensión exacta del archivo compilado. Vite sí
  resuelve imports sin extensión (por eso el frontend nunca mostró el
  problema) pero el runtime de `api/` no. Cómo evitarlo/detectarlo: todo
  import relativo dentro de `api/` (o compartido desde `src/`) debe escribirse
  con `.js` al final aunque el archivo fuente sea `.ts` (ej.
  `import { env } from "./env.js"`) — es la convención estándar de
  TypeScript+ESM. `tsc --noEmit` NO detecta este error porque
  `moduleResolution: "Bundler"` es permisivo; solo se ve corriendo el
  endpoint de verdad (`vercel curl <url>/api/health` o `vercel logs`),
  nunca solo con el build local.
- **Rutas del SPA dan 404 en Vercel al entrar directo (ej. `/admin`).**
  Qué pasó: `/`, que carga vía navegación del cliente, funciona bien; pero
  entrar directo a `/admin`, `/trabajador`, etc. (o refrescar en esas rutas)
  da `404: NOT_FOUND`. Por qué: React Router maneja el ruteo en el cliente,
  pero Vercel sirve archivos estáticos — sin una regla, busca un archivo
  literal en `/admin` y no existe. `vercel.json` solo tenía el rewrite de
  `/api/*`, faltaba el catch-all. Cómo evitarlo: `vercel.json` necesita
  `{ "source": "/(.*)", "destination": "/index.html" }` **después** de la
  regla de `/api/*` (los assets estáticos existentes se sirven igual,
  Vercel prioriza filesystem antes que rewrites).
- **Nominatim (OSM) no siempre encuentra un lugar por su nombre comercial.**
  Qué pasó: buscar "San Dámaso" no mostraba la planta de revisión técnica
  de La Florida, aunque sí mostraba otras 4 en distintas comunas. No era un
  bug — confirmado con `curl` directo a la API: esa planta existe en OSM
  (`Avenida Tobalaba, Lo Cañas, La Florida`) pero no está etiquetada con el
  nombre comercial "San Dámaso", solo como "Planta de Revisión Técnica"
  genérica. Por qué: Nominatim/OSM es geocoding de calles y POIs mapeados
  por la comunidad — no tiene el nivel de cobertura de nombres comerciales
  de Google Places. Cómo evitarlo/mitigarlo: buscar por dirección (calle +
  comuna) siempre funciona; buscar por nombre de negocio depende de si
  alguien lo etiquetó en OSM. Si esto se vuelve un problema frecuente,
  reconsiderar Google Places/Mapbox (decisión de Fase 1, tiene costo/API
  key — ver DESIGN.md o pedirle al usuario).
- **Vercel (plan Hobby) cuenta cada archivo `.ts` dentro de `api/` como una
  función serverless separada, hasta un máximo de 12 — no solo `api/index.ts`.**
  Qué pasó: al agregar `api/routes/serviceSuggestions.ts` (el archivo #13
  bajo `api/`), el deploy empezó a fallar con `"No more than 12 Serverless
  Functions can be added to a Deployment on the Hobby plan"`. El build
  (`npm run build`) pasaba limpio — el error solo aparece en la fase
  "Deploying outputs" de Vercel, no en `tsc`/`vite build` ni en CI local
  normal. Por qué: pese a que `vercel.json` solo define un rewrite hacia
  `/api` (pensado para que `api/index.ts` sea la única función, con Express
  ruteando todo internamente), la detección automática de Vercel trata
  *cualquier* archivo bajo `api/` — incluyendo `api/lib/*` y `api/routes/*`
  — como un endpoint propio, a menos que esté excluido explícitamente. Ya
  estábamos justo en el límite (12) antes de este cambio, así que no se
  notó hasta que se sumó un archivo más. Cómo se arregló: renombrar
  `api/lib/` → `api/_lib/` y `api/routes/` → `api/_routes/` — el prefijo
  `_` es la convención documentada de Vercel para excluir archivos/carpetas
  de la detección de funciones dentro de `api/`. Después del rename, `vercel
  build` local solo genera una función (`api/index.func`). Cómo detectarlo
  a futuro: `npx vercel build` local reproduce el build+empaquetado real
  (a diferencia de `npm run build`) — si hay un error en "Deploying
  outputs", correr `npx vercel deploy --prebuilt` local expone el mensaje
  completo que el log del deploy vía GitHub a veces trunca. Cualquier
  archivo `.ts` nuevo que se agregue directo bajo `api/` (no dentro de
  `_lib/` o `_routes/`) vuelve a sumar a este límite.
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

## Design System
Siempre leer DESIGN.md antes de tomar decisiones visuales o de UI. Ahí están
definidos tipografía, color, spacing y motion. No desviar sin aprobación
explícita del usuario. En QA, marcar cualquier código que no calce con
DESIGN.md.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec