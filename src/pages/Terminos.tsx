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
      "Para usar LiberaGo necesitas iniciar sesión con una cuenta válida. Para ofrecer servicios como Trabajador, además debes postular dentro de la app y ser aprobado por un administrador.",
    ],
  },
  {
    title: "3. Cómo funciona el pago",
    body: [
      "El pago del servicio se realiza en línea, a través de MercadoPago, al momento de crear la solicitud — antes de que cualquier Trabajador pueda verla o aceptarla.",
      "Una solicitud no se ofrece a ningún Trabajador hasta que el pago quede confirmado. Si el pago no se completa (por ejemplo, si cancelas el proceso o el pago es rechazado), la solicitud queda pendiente y puedes reintentar el pago o abandonarla.",
      "El precio mostrado antes de pagar es el precio final que se cobra — no hay cargos adicionales ocultos al momento del pago.",
    ],
  },
  {
    title: "4. Estados de una solicitud",
    body: [
      "Una solicitud pasa por los siguientes estados: pendiente de pago, solicitado, asignado, en curso y completado. También puede terminar como cancelado (LiberaGo decide no continuarla, generalmente antes de que un Trabajador la tome) o no completado (un Trabajador intentó hacerla pero no se pudo).",
    ],
  },
  {
    title: "5. Reembolsos",
    body: [
      "Si tu solicitud queda marcada como no completado, tienes derecho a un reembolso del 50% de lo pagado. El otro 50% cubre el tiempo y esfuerzo que el Trabajador ya invirtió en el intento, aunque no haya podido terminarlo.",
      "Si tu solicitud es cancelada por LiberaGo antes de que un Trabajador la tome, tienes derecho a un reembolso del 100% de lo pagado.",
      "Los reembolsos se procesan de vuelta al mismo medio de pago usado en MercadoPago y pueden tardar los días hábiles que MercadoPago indique según tu método de pago.",
    ],
  },
  {
    title: "6. Responsabilidad",
    body: [
      "LiberaGo pone el cuidado razonable en verificar a los Trabajadores antes de que aparezcan en la plataforma, pero no garantiza el resultado de cada trámite o mandado — eso depende de factores fuera de nuestro control (por ejemplo, el funcionamiento de la institución donde se hace el trámite).",
      "Cualquier problema con un Trabajador o con un Cliente durante un servicio puede reportarse a LiberaGo para revisión.",
    ],
  },
  {
    title: "7. Cambios a estos términos",
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
