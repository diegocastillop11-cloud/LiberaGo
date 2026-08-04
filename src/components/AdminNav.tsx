import { useNavigate } from "react-router-dom";
import { inputBase } from "../lib/ui";

const MODULES = [
  { path: "/admin", label: "Servicios" },
  { path: "/admin/trabajadores", label: "Trabajadores" },
  { path: "/admin/solicitudes", label: "Solicitudes" },
  { path: "/admin/usuarios", label: "Usuarios" },
  { path: "/admin/sugerencias", label: "Sugerencias" },
  { path: "/admin/finanzas", label: "Finanzas" },
];

export function AdminNav({ current }: { current: string }) {
  const navigate = useNavigate();

  return (
    <select
      className={`${inputBase} w-auto min-h-[44px]`}
      value={current}
      onChange={(e) => navigate(e.target.value)}
      aria-label="Módulo de administración"
    >
      {MODULES.map((m) => (
        <option key={m.path} value={m.path}>
          {m.label}
        </option>
      ))}
    </select>
  );
}
