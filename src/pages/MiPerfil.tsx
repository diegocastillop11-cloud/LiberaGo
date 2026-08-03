import { useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { btnPrimary, cardBase } from "../lib/ui";

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
      </main>
    </div>
  );
}
