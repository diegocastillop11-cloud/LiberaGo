import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { isValidRut, formatRut } from "../lib/rut";
import { btnPrimary, btnGhost, btnDanger, cardBase, inputBase } from "../lib/ui";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export default function MiPerfil() {
  const { user, profile, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      setError("El archivo tiene que ser una imagen.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("La imagen no puede pesar más de 5 MB.");
      return;
    }

    setError(null);
    setUploading(true);

    const path = `${user.id}/avatar`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    // Cache-busting: la key del objeto no cambia entre subidas, así que sin
    // esto el navegador podría seguir mostrando la foto vieja cacheada.
    const publicUrl = `${data.publicUrl}?v=${Date.now()}`;

    const { error: rpcError } = await supabase.rpc("set_own_avatar_url", { new_url: publicUrl });
    setUploading(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    await refreshProfile();
  }

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader subtitle="Mi perfil" />
      <main className="mx-auto max-w-[520px] px-6 py-10">
        <div className={`${cardBase} flex flex-col items-center gap-4 text-center`}>
          <p className="font-display text-xl font-semibold text-ink">Foto de perfil</p>
          <p className="text-sm text-ink-muted">
            Se muestra a la otra parte de la solicitud, para que sepan con quién están tratando.
            Obligatoria para que un admin te apruebe como trabajador.
          </p>

          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Tu foto de perfil"
              className="h-32 w-32 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-surface-2 text-sm text-ink-muted">
              Sin foto
            </div>
          )}

          {error && (
            <div className="w-full rounded-sm border border-error bg-error/10 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            className={btnPrimary}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Subiendo…" : profile?.avatar_url ? "Cambiar foto" : "Subir foto"}
          </button>
        </div>

        <div className="mt-6">
          <DatosPersonales fullName={profile?.full_name ?? null} rut={profile?.rut ?? null} onSaved={refreshProfile} />
        </div>

        <div className="mt-6">
          <EliminarCuenta />
        </div>
      </main>
    </div>
  );
}

function DatosPersonales({
  fullName,
  rut,
  onSaved,
}: {
  fullName: string | null;
  rut: string | null;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(fullName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const nameChanged = name.trim() !== (fullName ?? "");

  async function save() {
    setError(null);
    setSaving(true);

    const { error: err } = await supabase.rpc("set_own_full_name", { new_name: name.trim() });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }

    await onSaved();
  }

  return (
    <div className={cardBase}>
      <p className="font-display text-xl font-semibold text-ink">Datos personales</p>

      {error && (
        <div className="mt-4 rounded-sm border border-error bg-error/10 px-4 py-3 text-sm text-error">{error}</div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="miPerfilNombre" className="text-sm font-medium text-ink-muted">
            Nombre completo
          </label>
          <input
            id="miPerfilNombre"
            type="text"
            className={inputBase}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-muted">RUT</span>
          <p className="text-[15px] text-ink">{rut ?? "—"}</p>
          <p className="text-xs text-ink-muted">
            El RUT no se puede modificar una vez registrado.
          </p>
        </div>
      </div>

      <button
        type="button"
        className={`${btnPrimary} mt-4`}
        onClick={save}
        disabled={!nameChanged || name.trim().length === 0 || saving}
      >
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>
    </div>
  );
}

function EliminarCuenta() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [confirmRut, setConfirmRut] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function confirmDelete() {
    setError(null);

    if (!isValidRut(confirmRut)) {
      setError("Ese RUT no parece válido.");
      return;
    }
    if (motivo.trim().length === 0) {
      setError("Indica un motivo para eliminar tu cuenta.");
      return;
    }

    setSubmitting(true);
    const { error: err } = await supabase.rpc("request_account_deletion", {
      confirm_rut: formatRut(confirmRut),
      motivo: motivo.trim(),
    });

    if (err) {
      setError(err.message);
      setSubmitting(false);
      return;
    }

    await supabase.auth.signOut();
    navigate("/?cuenta-eliminada=1");
  }

  if (!expanded) {
    return (
      <div className={cardBase}>
        <p className="font-display text-xl font-semibold text-ink">Eliminar cuenta</p>
        <p className="mt-1 text-sm text-ink-muted">
          Esta acción es permanente. No podrás usar LiberaGo con esta cuenta nunca más.
        </p>
        <button type="button" className={`${btnDanger} mt-4`} onClick={() => setExpanded(true)}>
          Eliminar cuenta
        </button>
      </div>
    );
  }

  return (
    <div className={cardBase}>
      <p className="font-display text-xl font-semibold text-ink">Eliminar cuenta</p>
      <p className="mt-1 text-sm text-ink-muted">
        Esto es permanente. Necesitas no tener servicios asignados o en curso, y no ser
        administrador.
      </p>

      {error && (
        <div className="mt-4 rounded-sm border border-error bg-error/10 px-4 py-3 text-sm text-error">{error}</div>
      )}

      <div className="mt-4 flex flex-col gap-3 text-left">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="eliminarRut" className="text-sm font-medium text-ink-muted">
            RUT de confirmación
          </label>
          <input
            id="eliminarRut"
            type="text"
            className={inputBase}
            value={confirmRut}
            onChange={(e) => setConfirmRut(e.target.value)}
            placeholder="12.345.678-9"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="eliminarMotivo" className="text-sm font-medium text-ink-muted">
            Motivo
          </label>
          <textarea
            id="eliminarMotivo"
            className={inputBase}
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button type="button" className={btnGhost} onClick={() => setExpanded(false)} disabled={submitting}>
          Cancelar
        </button>
        <button type="button" className={btnDanger} onClick={confirmDelete} disabled={submitting}>
          {submitting ? "Eliminando…" : "Eliminar mi cuenta definitivamente"}
        </button>
      </div>
    </div>
  );
}
