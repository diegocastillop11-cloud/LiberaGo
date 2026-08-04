import { Link } from "react-router-dom";
import type { Profile } from "../lib/types";

export function UserBadge({ profile }: { profile: Profile | null }) {
  const label = profile?.full_name ?? profile?.email ?? "";
  const initial = label.charAt(0).toUpperCase() || "?";

  return (
    <Link
      to="/perfil"
      className="hidden items-center gap-2 rounded-sm transition-opacity duration-200 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 focus-visible:ring-offset-bg sm:flex"
    >
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt="" className="h-7 w-7 flex-shrink-0 rounded-full object-cover" />
      ) : (
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-action text-xs font-semibold text-on-action">
          {initial}
        </span>
      )}
      <span className="text-sm font-semibold text-ink">{label}</span>
    </Link>
  );
}
