import type { Profile } from "../lib/types";

export function UserBadge({ profile }: { profile: Profile | null }) {
  const label = profile?.full_name ?? profile?.email ?? "";
  const initial = label.charAt(0).toUpperCase() || "?";

  return (
    <div className="hidden items-center gap-2 sm:flex">
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt="" className="h-7 w-7 flex-shrink-0 rounded-full object-cover" />
      ) : (
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-action text-xs font-semibold text-on-action">
          {initial}
        </span>
      )}
      <span className="text-sm font-semibold text-ink">{label}</span>
    </div>
  );
}
