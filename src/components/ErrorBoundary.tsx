import { Component, type ReactNode } from "react";
import { btnPrimary } from "../lib/ui";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Error no capturado:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
          <p className="font-display text-2xl font-semibold text-ink">Algo salió mal</p>
          <p className="max-w-sm text-sm text-ink-muted">
            Tuvimos un error inesperado. Intenta recargar la página — si sigue pasando,
            avísanos.
          </p>
          <button className={btnPrimary} onClick={() => window.location.reload()}>
            Recargar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
