import { clearCurrentAccountData } from "./account-data";

export type AuthProviderName = "google" | "apple" | "github";
export type AuthUser = { id: string; name: string; email: string; avatarUrl?: string; provider: "local" | AuthProviderName };
export type AuthSession = { user: AuthUser; accessToken?: string; refreshToken?: string };
type LocalUser = AuthUser & { passwordHash: string; salt: string };

const USERS_KEY = "dsa-auth-users";
const SESSION_KEY = "dsa-auth-session";

export function hasSupabaseAuth() { return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY); }
function readJson<T>(key: string, fallback: T): T { if (typeof window === "undefined") return fallback; try { const value = window.localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } }
function writeJson(key: string, value: unknown) { window.localStorage.setItem(key, JSON.stringify(value)); }
function randomId() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
async function hashPassword(password: string, salt: string) { const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${password}`)); return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join(""); }
function supabaseConfig() { return { url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "", key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" }; }
async function supabaseRequest(path: string, init: RequestInit = {}) { const { url, key } = supabaseConfig(); const response = await fetch(`${url}${path}`, { ...init, headers: { apikey: key, "Content-Type": "application/json", ...(init.headers ?? {}) } }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.msg || body.error_description || body.error || "Authentication failed."); return body; }
function userFromSupabase(data: any, provider: AuthUser["provider"] = "local"): AuthUser { const metadata = data.user_metadata ?? {}; return { id: data.id, email: data.email ?? "", name: metadata.full_name ?? metadata.name ?? data.email?.split("@")[0] ?? "DSA learner", avatarUrl: metadata.avatar_url ?? metadata.picture, provider }; }
export function getStoredSession(): AuthSession | null { return readJson<AuthSession | null>(SESSION_KEY, null); }
function storeSession(session: AuthSession) { writeJson(SESSION_KEY, session); window.dispatchEvent(new Event("dsa-auth-changed")); return session; }

export async function signUp(name: string, email: string, password: string): Promise<AuthSession> {
  if (hasSupabaseAuth()) { const data = await supabaseRequest("/auth/v1/signup", { method: "POST", body: JSON.stringify({ email, password, options: { data: { full_name: name } } }) }); if (!data.access_token) throw new Error("Account created. Check your email to confirm the account, then sign in."); return storeSession({ user: userFromSupabase(data.user), accessToken: data.access_token, refreshToken: data.refresh_token }); }
  const normalizedEmail = email.trim().toLowerCase(); const users = readJson<LocalUser[]>(USERS_KEY, []); if (users.some((user) => user.email === normalizedEmail)) throw new Error("An account with this email already exists."); const salt = `${randomId()}-${Math.random().toString(36).slice(2)}`; const user: LocalUser = { id: randomId(), name: name.trim(), email: normalizedEmail, provider: "local", salt, passwordHash: await hashPassword(password, salt) }; writeJson(USERS_KEY, [...users, user]); return storeSession({ user: { id: user.id, name: user.name, email: user.email, provider: "local" } });
}
export async function signIn(email: string, password: string): Promise<AuthSession> {
  if (hasSupabaseAuth()) { const data = await supabaseRequest("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email: email.trim(), password }) }); return storeSession({ user: userFromSupabase(data.user), accessToken: data.access_token, refreshToken: data.refresh_token }); }
  const normalizedEmail = email.trim().toLowerCase(); const user = readJson<LocalUser[]>(USERS_KEY, []).find((candidate) => candidate.email === normalizedEmail); if (!user || user.passwordHash !== await hashPassword(password, user.salt)) throw new Error("Email or password is incorrect."); return storeSession({ user: { id: user.id, name: user.name, email: user.email, provider: "local" } });
}
export async function updateDisplayName(name: string): Promise<AuthSession> {
  const session = getStoredSession();
  const normalizedName = name.trim();
  if (!session) throw new Error("You must be signed in to update your profile.");
  if (normalizedName.length < 2) throw new Error("Display name must be at least 2 characters.");
  if (hasSupabaseAuth() && session.accessToken) {
    await supabaseRequest("/auth/v1/user", { method: "PUT", headers: { Authorization: `Bearer ${session.accessToken}` }, body: JSON.stringify({ data: { full_name: normalizedName, name: normalizedName } }) });
  } else if (session.user.provider === "local") {
    const users = readJson<LocalUser[]>(USERS_KEY, []);
    writeJson(USERS_KEY, users.map((user) => user.id === session.user.id ? { ...user, name: normalizedName } : user));
  }
  return storeSession({ ...session, user: { ...session.user, name: normalizedName } });
}
export async function deleteAccount(password: string): Promise<void> {
  const session = getStoredSession();
  if (!session) throw new Error("You must be signed in to delete your account.");
  if (!password.trim()) throw new Error("Enter your current login password to continue.");

  if (hasSupabaseAuth()) {
    const verification = await supabaseRequest("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email: session.user.email, password }) });
    await supabaseRequest("/auth/v1/user", { method: "DELETE", headers: { Authorization: `Bearer ${verification.access_token}` } });
  } else {
    if (session.user.provider !== "local") throw new Error("This account uses an external provider and has no login password to confirm deletion.");
    const user = readJson<LocalUser[]>(USERS_KEY, []).find((candidate) => candidate.id === session.user.id);
    if (!user || user.passwordHash !== await hashPassword(password, user.salt)) throw new Error("The current login password is incorrect.");
    writeJson(USERS_KEY, readJson<LocalUser[]>(USERS_KEY, []).filter((candidate) => candidate.id !== session.user.id));
  }

  clearCurrentAccountData();
  window.localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("dsa-auth-changed"));
  window.dispatchEvent(new Event("dsa-profile-changed"));
  window.dispatchEvent(new Event("submission-created"));
}
export async function signInWithProvider(provider: AuthProviderName) { if (!hasSupabaseAuth()) throw new Error("Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable Google, Apple, and GitHub sign-in."); const { url } = supabaseConfig(); window.location.assign(`${url}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(`${window.location.origin}/auth/callback`)}`); }
export async function completeOAuthCallback(): Promise<AuthSession> { const hash = new URLSearchParams(window.location.hash.replace(/^#/, "")); const error = hash.get("error_description") || hash.get("error"); if (error) throw new Error(error); const accessToken = hash.get("access_token"); if (!accessToken) throw new Error("The provider did not return a valid session."); const data = await supabaseRequest("/auth/v1/user", { headers: { Authorization: `Bearer ${accessToken}` } }); const provider = (data.app_metadata?.provider ?? "google") as AuthUser["provider"]; return storeSession({ user: userFromSupabase(data, provider), accessToken, refreshToken: hash.get("refresh_token") ?? undefined }); }
export function signOut() { if (typeof window === "undefined") return; window.localStorage.removeItem(SESSION_KEY); window.dispatchEvent(new Event("dsa-auth-changed")); }
