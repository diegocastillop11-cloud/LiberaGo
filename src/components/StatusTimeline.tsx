type Step = {
  label: string;
  sub?: string;
};

const steps: Step[] = [
  { label: "Solicitado", sub: "10:14" },
  { label: "Trabajador asignado", sub: "10:19" },
  { label: "En curso", sub: "Camino a la Planta de Revisión Técnica" },
  { label: "Completado" },
];

const currentIndex = 2;

export function StatusTimeline() {
  return (
    <div className="rounded-lg border border-line bg-surface p-6 shadow-[0_1px_2px_rgb(58_38_17/0.08),0_12px_28px_rgb(58_38_17/0.12)]">
      <div className="mb-5 flex items-center justify-between">
        <span className="font-display text-lg font-semibold text-ink">
          Revisión técnica
        </span>
        <span className="rounded-full bg-action/10 px-3 py-1 text-xs font-semibold text-action-ink">
          En curso
        </span>
      </div>

      <ol className="flex flex-col">
        {steps.map((step, i) => {
          const done = i < currentIndex;
          const current = i === currentIndex;
          const isLast = i === steps.length - 1;
          return (
            <li key={step.label} className="relative flex gap-3 pb-6 last:pb-0">
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[6px] top-[18px] h-[calc(100%-6px)] w-0.5 ${
                    done ? "bg-confirmed" : "bg-line"
                  }`}
                />
              )}
              <span
                aria-hidden="true"
                className={`relative z-10 mt-1 h-3.5 w-3.5 flex-shrink-0 rounded-full border-2 ${
                  current
                    ? "pulse-dot border-action bg-action"
                    : done
                      ? "border-confirmed bg-confirmed"
                      : "border-line bg-surface-2"
                }`}
              />
              <div>
                <p
                  className={`text-sm ${
                    current
                      ? "font-bold text-action-ink"
                      : done
                        ? "font-medium text-ink"
                        : "font-medium text-ink-muted"
                  }`}
                >
                  {step.label}
                </p>
                {step.sub && (
                  <p className="mt-0.5 text-xs text-ink-muted">{step.sub}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-5 flex items-center gap-3 rounded-md bg-surface-2 p-3.5">
        <div
          aria-hidden="true"
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-muted"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">Ricardo Fuentes</p>
          <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-confirmed px-2.5 py-0.5 text-[11px] font-semibold text-on-confirmed">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Verificado
          </span>
        </div>
      </div>
    </div>
  );
}
