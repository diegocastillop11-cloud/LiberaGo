import { validateEnv } from "./validateEnv";

export const env = validateEnv(import.meta.env as Record<string, string | undefined>, [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
] as const);
