type Meta = Record<string, unknown>;

function emit(
  level: "error" | "warn" | "info",
  scope: string,
  message: string,
  meta?: Meta,
): void {
  const payload = { level, scope, message, ...(meta ? { meta } : {}) };
  const sink =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : console.info;
  sink(JSON.stringify(payload));
}

/** Erreur avérée (échec d'une opération attendue comme fiable). */
export function logError(scope: string, message: string, meta?: Meta): void {
  emit("error", scope, message, meta);
}

/** Dégradation best-effort tolérée (ex. scraping impossible → repli). */
export function logWarn(scope: string, message: string, meta?: Meta): void {
  emit("warn", scope, message, meta);
}

/** Information de traçage (rare — préférer warn/error). */
export function logInfo(scope: string, message: string, meta?: Meta): void {
  emit("info", scope, message, meta);
}

/** Normalise une valeur inconnue attrapée dans un `catch` en message lisible. */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
