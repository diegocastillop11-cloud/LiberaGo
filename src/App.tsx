import { Routes, Route, Link } from "react-router-dom";
import Landing from "./pages/Landing";
import ClienteSolicitar from "./pages/ClienteSolicitar";
import ClienteSolicitudes from "./pages/ClienteSolicitudes";
import ClienteSolicitudDetalle from "./pages/ClienteSolicitudDetalle";
import TrabajadorDisponibles from "./pages/TrabajadorDisponibles";
import AdminServices from "./pages/AdminServices";
import AdminTrabajadores from "./pages/AdminTrabajadores";
import { RequireAuth } from "./components/RequireAuth";

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

      <Route
        path="/cliente"
        element={
          <RequireAuth>
            <ClienteSolicitar />
          </RequireAuth>
        }
      />
      <Route
        path="/cliente/solicitudes"
        element={
          <RequireAuth>
            <ClienteSolicitudes />
          </RequireAuth>
        }
      />
      <Route
        path="/cliente/solicitudes/:id"
        element={
          <RequireAuth>
            <ClienteSolicitudDetalle />
          </RequireAuth>
        }
      />

      <Route
        path="/trabajador"
        element={
          <RequireAuth require="worker">
            <TrabajadorDisponibles />
          </RequireAuth>
        }
      />

      <Route
        path="/admin"
        element={
          <RequireAuth require="admin">
            <AdminServices />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/trabajadores"
        element={
          <RequireAuth require="admin">
            <AdminTrabajadores />
          </RequireAuth>
        }
      />

      <Route path="*" element={<Placeholder title="Página no encontrada" />} />
    </Routes>
  );
}
