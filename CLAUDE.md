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
  lib/
    env.ts        # validación fail-fast de env vars del backend
    supabase.ts   # cliente Supabase con service_role key (solo backend)
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
`api/lib/env.ts`): trim, limpiar BOM, rechazar si contiene `\r` o `\n` —
fail-fast con mensaje claro, no un error críptico downstream.
En Vercel, las env vars de **preview están escopeadas por rama** — cada rama
nueva sale "en negro" hasta agregarlas a mano para esa rama en Project
Settings > Environment Variables.
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