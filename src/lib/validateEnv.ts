export function validateEnv<T extends string>(
  source: Record<string, string | undefined>,
  keys: readonly T[],
): Record<T, string> {
  const result = {} as Record<T, string>;
  const errors: string[] = [];

  for (const key of keys) {
    const raw = source[key];
    if (raw === undefined) {
      errors.push(`${key}: falta`);
      continue;
    }
    const cleaned = raw.replace(/^﻿/, "").trim();
    if (cleaned.length === 0) {
      errors.push(`${key}: vacía después de trim`);
      continue;
    }
    if (cleaned.includes("\r") || cleaned.includes("\n")) {
      errors.push(`${key}: contiene salto de línea — probablemente pegada desde un dashboard`);
      continue;
    }
    result[key] = cleaned;
  }

  if (errors.length > 0) {
    throw new Error(`Env vars inválidas:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  }

  return result;
}
