import { Link } from "react-router-dom";
import { Reveal } from "../components/Reveal";
import { UserBadge } from "../components/UserBadge";
import { Logo } from "../components/Logo";
import { StatusTimeline } from "../components/StatusTimeline";
import { useAuth } from "../lib/AuthContext";
import { btnPrimary, btnSecondary, btnGhost, navLink } from "../lib/ui";

const servicios = [
  {
    title: "Trámites y filas",
    desc: "Revisión técnica, notaría, registro civil — cualquier fila que te robe la mañana.",
  },
  {
    title: "Filas de eventos",
    desc: "Conciertos, estrenos, lanzamientos. Alguien te guarda el lugar desde temprano.",
  },
  {
    title: "Mandados",
    desc: "Comprar un repuesto, retirar algo, dejar un pedido en la puerta correcta.",
  },
  {
    title: "¿Algo distinto?",
    desc: "Si es una tarea que se puede hacer por ti, probablemente la puedas publicar.",
  },
];

const pasos = [
  {
    n: "1",
    title: "Pides lo que necesitas",
    desc: "Cuéntanos qué trámite, fila o mandado te tiene sin ganas. Un par de datos y listo.",
  },
  {
    n: "2",
    title: "Un trabajador verificado lo acepta",
    desc: "Alguien cercano ve tu solicitud y la toma. Ves su nombre y su verificación antes de que empiece.",
  },
  {
    n: "3",
    title: "Sigues el estado en vivo",
    desc: "Sabes exactamente en qué va tu pedido, sin tener que preguntar ni refrescar la página.",
  },
];

const confianza = [
  {
    title: "Verificación real",
    desc: "Cada trabajador pasa una verificación antes de aparecer en la app.",
  },
  {
    title: "Estado en vivo",
    desc: "Ves cada cambio apenas pasa — solicitado, asignado, en curso, completado.",
  },
  {
    title: "Sabes quién viene",
    desc: "Nombre y verificación del trabajador, visibles desde que acepta tu pedido.",
  },
];

export default function Landing() {
  const { session, profile, loading, signOut } = useAuth();

  return (
    <>
      <a
        href="#main"
        className="fixed left-4 top-4 z-50 -translate-y-16 rounded-md bg-ink px-4 py-2 text-sm font-medium text-surface transition-transform focus:translate-y-0"
      >
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-4">
          <Logo className="h-10" />
          <nav aria-label="Principal" className="hidden items-center gap-8 md:flex">
            <a href="#como-funciona" className={navLink}>
              Cómo funciona
            </a>
            <a href="#servicios" className={navLink}>
              Servicios
            </a>
            <Link to="/trabajador" className={navLink}>
              Trabaja con nosotros
            </Link>
            <Link to="/terminos" className={navLink}>
              Términos y Condiciones
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            {!loading &&
              (session ? (
                <>
                  <UserBadge profile={profile} />
                  <button className={btnGhost} onClick={signOut}>
                    Salir
                  </button>
                </>
              ) : (
                <Link to="/login" className={btnGhost}>
                  Iniciar sesión
                </Link>
              ))}
            <Link to="/cliente" className={btnPrimary}>
              Pedir un servicio
            </Link>
          </div>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="mx-auto max-w-[1180px] px-6 pb-20 pt-16 md:pb-28 md:pt-24">
          <div className="grid items-center gap-14 md:grid-cols-[1.1fr_0.9fr]">
            <div>
              <h1 className="text-balance font-display text-[40px] font-semibold leading-[1.08] text-ink md:text-[56px]">
                Ese trámite que te da flojera, alguien más lo hace por ti.
              </h1>
              <p className="mt-6 max-w-[46ch] text-pretty text-lg text-ink-muted md:text-xl">
                LiberaGo conecta a quien no quiere hacer una fila, un trámite o un
                mandado con un trabajador verificado que lo hace por él — y lo sigues
                en vivo hasta que esté listo.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/cliente" className={btnPrimary}>
                  Pedir un servicio
                </Link>
                <Link to="/trabajador" className={btnSecondary}>
                  Trabajar con LiberaGo
                </Link>
              </div>
              <p className="mt-4 text-sm text-ink-muted">
                Pagas en línea con Mercado Pago al pedir el servicio — nada de coordinar plata en
                persona. Revisa nuestros{" "}
                <Link to="/terminos" className="text-action underline-offset-4 hover:underline">
                  Términos y Condiciones
                </Link>
                .
              </p>
            </div>

            <div>
              <div className="mb-8 flex justify-center">
                <Logo className="h-20" linkTo={null} />
              </div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-confirmed-ink">
                Así se ve tu pedido, en vivo
              </p>
              <StatusTimeline />
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="scroll-mt-24 border-t border-line">
          <div className="mx-auto max-w-[1180px] px-6 py-20">
            <Reveal className="max-w-[60ch]">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-confirmed-ink">
                Cómo funciona
              </span>
              <h2 className="text-balance font-display text-3xl font-semibold text-ink">
                Tres pasos, en ese orden
              </h2>
            </Reveal>

            <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              {pasos.map((paso, i) => (
                <Reveal key={paso.n} delay={i * 80}>
                  <li className="list-none">
                    <span
                      aria-hidden="true"
                      className="font-display text-4xl font-semibold text-action/25"
                    >
                      {paso.n}
                    </span>
                    <h3 className="mt-3 text-lg font-semibold text-ink">
                      {paso.title}
                    </h3>
                    <p className="mt-2 text-pretty text-[15px] leading-relaxed text-ink-muted">
                      {paso.desc}
                    </p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Servicios */}
        <section id="servicios" className="scroll-mt-24 border-t border-line">
          <div className="mx-auto max-w-[1180px] px-6 py-20">
            <Reveal className="max-w-[60ch]">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-confirmed-ink">
                Qué puedes pedir
              </span>
              <h2 className="text-balance font-display text-3xl font-semibold text-ink">
                La tarea que estás postergando, probablemente aplique
              </h2>
            </Reveal>

            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {servicios.map((s, i) => (
                <Reveal key={s.title} delay={i * 60}>
                  <div className="h-full rounded-lg border border-line bg-surface p-6">
                    <h3 className="font-display text-lg font-semibold text-ink">
                      {s.title}
                    </h3>
                    <p className="mt-2 text-pretty text-[15px] leading-relaxed text-ink-muted">
                      {s.desc}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={servicios.length * 60} className="mt-8">
              <Link to="/sugerir-servicio" className={btnGhost}>
                ¿No encuentras el servicio que necesitas?
              </Link>
            </Reveal>
          </div>
        </section>

        {/* Confianza */}
        <section className="border-t border-line">
          <div className="mx-auto max-w-[1180px] px-6 py-20">
            <Reveal className="max-w-[60ch]">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-confirmed-ink">
                Por qué confiar
              </span>
              <h2 className="text-balance font-display text-3xl font-semibold text-ink">
                Le entregas tu trámite a alguien que no ves — esto lo compensa
              </h2>
            </Reveal>

            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {confianza.map((c, i) => (
                <Reveal key={c.title} delay={i * 70}>
                  <div className="flex gap-3">
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="mt-0.5 flex-shrink-0 text-confirmed"
                      aria-hidden="true"
                    >
                      <path
                        d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M9 12.5l2 2 4-4.5"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div>
                      <h3 className="font-semibold text-ink">{c.title}</h3>
                      <p className="mt-1 text-pretty text-[15px] leading-relaxed text-ink-muted">
                        {c.desc}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="border-t border-line">
          <div className="mx-auto max-w-[1180px] px-6 py-20">
            <Reveal className="grid gap-6 rounded-lg border border-line bg-surface p-10 md:grid-cols-2 md:p-14">
              <div>
                <h2 className="text-balance font-display text-2xl font-semibold text-ink">
                  ¿Necesitas que te hagan algo?
                </h2>
                <p className="mt-2 max-w-[42ch] text-pretty text-[15px] text-ink-muted">
                  Publica tu solicitud y un trabajador verificado la toma.
                </p>
                <Link to="/cliente" className={`${btnPrimary} mt-6`}>
                  Pedir un servicio
                </Link>
              </div>
              <div className="border-t border-line pt-6 md:border-l md:border-t-0 md:pl-10 md:pt-0">
                <h2 className="text-balance font-display text-2xl font-semibold text-ink">
                  ¿Quieres hacer mandados y ganar plata?
                </h2>
                <p className="mt-2 max-w-[42ch] text-pretty text-[15px] text-ink-muted">
                  Elige las solicitudes que te acomodan, cuando quieras.
                </p>
                <Link to="/trabajador" className={`${btnSecondary} mt-6`}>
                  Trabajar con LiberaGo
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-3 px-6 py-10 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <Logo className="h-7" />
          <div className="flex items-center gap-4">
            <Link to="/terminos" className="hover:text-ink hover:underline underline-offset-4">
              Términos y Condiciones
            </Link>
            <span>Santiago, Chile · © 2026</span>
          </div>
        </div>
      </footer>
    </>
  );
}
