const SESSION_KEY = "dsa-auth-session";

function currentAccountScope() {
  if (typeof window === "undefined") return "guest";
  try {
    const session = JSON.parse(window.localStorage.getItem(SESSION_KEY) ?? "null") as { user?: { id?: string } } | null;
    return session?.user?.id || "guest";
  } catch {
    return "guest";
  }
}

export function accountStorageKey(baseKey: string) {
  return `dsa-account:${encodeURIComponent(currentAccountScope())}:${baseKey}`;
}

export function readAccountData<T>(baseKey: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const scopedKey = accountStorageKey(baseKey);
  try {
    let saved = window.localStorage.getItem(scopedKey);
    if (saved === null) {
      const legacy = window.localStorage.getItem(baseKey);
      if (legacy !== null) {
        window.localStorage.setItem(scopedKey, legacy);
        window.localStorage.removeItem(baseKey);
        saved = legacy;
      }
    }
    return saved === null ? fallback : JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
}

export function writeAccountData(baseKey: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(accountStorageKey(baseKey), JSON.stringify(value));
}

export function removeAccountData(baseKey: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(accountStorageKey(baseKey));
}

export function clearCurrentAccountData() {
  ["dsa-profile-details", "dsa-submissions", "dsa-solved"].forEach(removeAccountData);
}
