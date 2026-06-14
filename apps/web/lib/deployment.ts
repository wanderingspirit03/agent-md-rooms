export function defaultSyncUrl(): string {
  const configured = process.env.NEXT_PUBLIC_FOLD_SYNC_URL || process.env.NEXT_PUBLIC_FOLD_PUBLIC_URL;
  if (configured) return normalizeUrl(configured);
  if (typeof window === "undefined") return "http://127.0.0.1:8787";

  const origin = window.location.origin;
  if (!isLocalOrigin(origin)) return origin;
  return "http://127.0.0.1:8787";
}

function normalizeUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function isLocalOrigin(origin: string) {
  try {
    const host = new URL(origin).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return true;
  }
}
