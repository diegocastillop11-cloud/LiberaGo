import { validateEnv } from "../../src/lib/validateEnv";

export const env = validateEnv(process.env, ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const);
