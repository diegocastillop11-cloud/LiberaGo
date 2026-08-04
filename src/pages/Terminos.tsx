import { Link } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { btnGhost } from "../lib/ui";

const secciones = [
  {
    title: "1. Qué es LiberaGo",
    body: [
      "LiberaGo es una plataforma que conecta a personas que necesitan hacer un trámite, una fila o un mandado (\"Clientes\") con personas dispuestas a hacerlo por ellas a cambio de un pago (\"Trabajadores\").",
      "LiberaGo actúa como intermediario tecnológico: no realiza los trámites ni mandados directamente, y los Trabajadores no son empleados de LiberaGo — son independientes que ofrecen sus servicios a través de la plataforma.",
    ],
  },
  {
    title: "2. Cuentas y verificación",
    body: [
      "Para usar LiberaGo necesitas iniciar sesión con una cuenta válida, sea con correo y contraseña o con Google. Sin importar el método que uses para entrar, la primera vez que accedes te pedimos completar tu nombre y tu RUT, y aceptar explícitamente estos Términos y Condiciones — no se asume tu aceptación por el solo hecho de crear la cuenta, ni se te deja usar la plataforma sin esos datos básicos.",
      "Para ofrecer servicios como Trabajador, además debes postular dentro de la app, verificar tu identidad con documento y selfie, subir una foto de perfil y ser aprobado por un administrador — los tres requisitos son obligatorios, no basta con uno solo.",
    ],
  },
  {
    title: "3. Verificación de identidad",
    body: [
      "El nivel de verificación es distinto para Cliente y Trabajador, porque el riesgo es distinto: un Trabajador entra a espacios del Cliente o recibe pagos en persona, mientras que el pago del Cliente ya queda cubierto por adelantado a través de MercadoPago antes de que cualquier Trabajador vea la solicitud.",
      "Trabajador: exigimos verificación completa — documento de identidad, selfie y comparación biométrica — antes de que un administrador pueda aprobar la postulación. Esta verificación la realiza un proveedor externo especializado (Didit), no LiberaGo directamente. LiberaGo no almacena el documento de identidad ni el RUN del Trabajador — solo guarda si la verificación quedó aprobada o no, y una referencia interna a la sesión de verificación, nunca el documento ni la foto en sí. La verificación requiere ser mayor de 18 años.",
      "Cliente: pedimos tu RUT apenas creas la cuenta — es un dato que tú mismo ingresas (no verificamos el documento físico), pensado para poder identificarte ante un eventual reclamo o disputa, no como prueba biométrica de identidad.",
      "Si una verificación (de Trabajador) es rechazada, puedes volver a intentarlo.",
    ],
  },
  {
    title: "4. Protección de datos personales",
    body: [
      "Los datos que LiberaGo guarda sobre ti son: tu correo, nombre, RUT, teléfono de contacto (si lo entregas al crear una solicitud), tu foto de perfil, el resultado de tu verificación de identidad (si eres Trabajador), y el historial de tus solicitudes.",
      "Estos datos se usan únicamente para operar la plataforma — conectar Clientes con Trabajadores, procesar pagos y confirmar identidad — y no se venden ni se comparten con terceros salvo los proveedores necesarios para operar (MercadoPago para pagos, Didit para verificación de identidad de Trabajadores).",
      "Tu foto de perfil es visible para la otra parte de una solicitud (el Cliente ve la foto del Trabajador asignado y viceversa) — es información pensada para generar confianza, no es privada dentro de ese contexto.",
      "Puedes pedir la eliminación de tu cuenta y tus datos contactando a LiberaGo, salvo la información que la ley obligue a conservar (por ejemplo, registros de pagos).",
    ],
  },
  {
    title: "5. Cómo funciona el pago",
    body: [
      "El pago del servicio se realiza en línea, a través de MercadoPago, al momento de crear la solicitud — antes de que cualquier Trabajador pueda verla o aceptarla.",
      "Una solicitud no se ofrece a ningún Trabajador hasta que el pago quede confirmado. Si el pago no se completa (por ejemplo, si cancelas el proceso o el pago es rechazado), la solicitud queda pendiente y puedes reintentar el pago o abandonarla.",
      "El precio mostrado antes de pagar es el precio final que se cobra — no hay cargos adicionales ocultos al momento del pago.",
    ],
  },
  {
    title: "6. Estados de una solicitud",
    body: [
      "Una solicitud pasa por los siguientes estados: pendiente de pago, solicitado, asignado, en curso y completado. También puede terminar como cancelado (LiberaGo decide no continuarla, generalmente antes de que un Trabajador la tome) o no completado (un Trabajador intentó hacerla pero no se pudo).",
    ],
  },
  {
    title: "7. Reembolsos",
    body: [
      "Si tu solicitud queda marcada como no completado por una causa de fuerza mayor ajena al Trabajador y al Cliente (por ejemplo, el lugar del trámite cerró antes de tiempo, la institución canceló el trámite, un accidente, etc.), tienes derecho a un reembolso del 50% de lo pagado. El otro 50% cubre el tiempo y los recursos que el Trabajador ya invirtió en el intento.",
      "Este reembolso del 50% no aplica si la solicitud no se completó por una causa atribuible al Cliente — por ejemplo, no estar presente cuando correspondía, entregar una dirección o información incorrecta, o arrepentirse después de que el Trabajador ya inició el servicio. En esos casos el Trabajador igualmente gastó su tiempo y sus recursos, y no corresponde reembolso.",
      "LiberaGo revisa cada solicitud marcada como no completado antes de autorizar cualquier reembolso — no es un proceso automático — precisamente para evitar el uso indebido de esta cláusula.",
      "Si tu solicitud es cancelada por LiberaGo antes de que un Trabajador la tome, tienes derecho a un reembolso del 100% de lo pagado.",
      "Los reembolsos se procesan de vuelta al mismo medio de pago usado en MercadoPago y pueden tardar los días hábiles que MercadoPago indique según tu método de pago.",
    ],
  },
  {
    title: "8. Uso indebido y fraude",
    body: [
      "La cláusula de reembolso del 50% existe para cubrir casos genuinos de fuerza mayor, no como una forma de recuperar parte del pago de una solicitud que un Cliente ya no quiere o de la que se arrepintió — el Trabajador gasta tiempo y recursos reales en cada intento, se complete o no.",
      "LiberaGo puede rechazar un reembolso, suspender una cuenta o negar el acceso a la plataforma si detecta un patrón de solicitudes creadas de mala fe — por ejemplo, para intentar obtener reembolsos sin una causa real de fuerza mayor.",
    ],
  },
  {
    title: "9. Responsabilidad",
    body: [
      "LiberaGo pone el cuidado razonable en verificar a los Trabajadores antes de que aparezcan en la plataforma, pero no garantiza el resultado de cada trámite o mandado — eso depende de factores fuera de nuestro control (por ejemplo, el funcionamiento de la institución donde se hace el trámite).",
      "Cualquier problema con un Trabajador o con un Cliente durante un servicio puede reportarse a LiberaGo para revisión.",
    ],
  },
  {
    title: "10. Cambios a estos términos",
    body: [
      "Estos términos pueden actualizarse a medida que la plataforma evoluciona. Los cambios aplican a las solicitudes creadas después de la actualización.",
    ],
  },
];

export default function Terminos() {
  return (
    <div className="min-h-screen bg-bg">
      <AppHeader
        maxWidth={720}
        actions={
          <Link to="/" className={btnGhost}>
            Volver al inicio
          </Link>
        }
      />

      <main className="mx-auto max-w-[720px] px-6 py-10">
        <h1 className="font-display text-2xl font-semibold text-ink">Términos y Condiciones</h1>
        <p className="mt-2 text-sm text-ink-muted">Última actualización: agosto de 2026.</p>

        <div className="mt-8 flex flex-col gap-8">
          {secciones.map((s) => (
            <section key={s.title}>
              <h2 className="font-display text-lg font-semibold text-ink">{s.title}</h2>
              <div className="mt-2 flex flex-col gap-2">
                {s.body.map((p, i) => (
                  <p key={i} className="text-pretty text-[15px] leading-relaxed text-ink-muted">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
