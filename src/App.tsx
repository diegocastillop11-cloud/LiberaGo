import { Routes, Route, Link } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Terminos from "./pages/Terminos";
import SugerirServicio from "./pages/SugerirServicio";
import TrabajaConNosotros from "./pages/TrabajaConNosotros";
import ClienteSolicitar from "./pages/ClienteSolicitar";
import ClienteSolicitudes from "./pages/ClienteSolicitudes";
import ClienteSolicitudDetalle from "./pages/ClienteSolicitudDetalle";
import VerificarIdentidad from "./pages/VerificarIdentidad";
import VerificarRut from "./pages/VerificarRut";
import MiPerfil from "./pages/MiPerfil";
import TrabajadorDisponibles from "./pages/TrabajadorDisponibles";
import AdminServices from "./pages/AdminServices";
import AdminTrabajadores from "./pages/AdminTrabajadores";
import AdminSolicitudes from "./pages/AdminSolicitudes";
import AdminSugerencias from "./pages/AdminSugerencias";
import AdminUsuarios from "./pages/AdminUsuarios";
import AdminFinanzas from "./pages/AdminFinanzas";
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
      <Route path="/login" element={<Login />} />
      <Route path="/terminos" element={<Terminos />} />
      <Route path="/sugerir-servicio" element={<SugerirServicio />} />
      <Route path="/trabaja-con-nosotros" element={<TrabajaConNosotros />} />

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
        path="/verificacion"
        element={
          <RequireAuth>
            <VerificarIdentidad />
          </RequireAuth>
        }
      />

      <Route
        path="/rut"
        element={
          <RequireAuth>
            <VerificarRut />
          </RequireAuth>
        }
      />

      <Route
        path="/perfil"
        element={
          <RequireAuth>
            <MiPerfil />
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
      <Route
        path="/admin/solicitudes"
        element={
          <RequireAuth require="admin">
            <AdminSolicitudes />
          </RequireAuth>
        }
      />

      <Route
        path="/admin/sugerencias"
        element={
          <RequireAuth require="admin">
            <AdminSugerencias />
          </RequireAuth>
        }
      />

      <Route
        path="/admin/usuarios"
        element={
          <RequireAuth require="admin">
            <AdminUsuarios />
          </RequireAuth>
        }
      />

      <Route
        path="/admin/finanzas"
        element={
          <RequireAuth require="admin">
            <AdminFinanzas />
          </RequireAuth>
        }
      />

      <Route path="*" element={<Placeholder title="Página no encontrada" />} />
    </Routes>
  );
}
