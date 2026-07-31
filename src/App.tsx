import { Routes, Route, Link } from "react-router-dom";
import Landing from "./pages/Landing";

function Placeholder({ title }: { title: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
      <p className="font-display text-2xl font-semibold text-ink">{title}</p>
      <p className="text-ink-muted">Pendiente de construir.</p>
      <Link
        to="/"
        className="text-sm font-medium text-action underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded-sm"
      >
        Volver al inicio
      </Link>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/cliente/*" element={<Placeholder title="Vista cliente" />} />
      <Route path="/trabajador/*" element={<Placeholder title="Vista trabajador" />} />
      <Route path="/admin/*" element={<Placeholder title="Vista admin" />} />
    </Routes>
  );
}
