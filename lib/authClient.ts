// ── InsForge Auth (browser) ──────────────────────────────────────
// Client-side auth using @insforge/sdk. The SDK manages the session
// (httpOnly refresh cookie + access token). We expose simple helpers
// the UI calls, and read the access token to send to our API so reports
// are scoped to the logged-in user.
//
// Public config is injected at build via NEXT_PUBLIC_* env vars.

"use client";

import { createClient } from "@insforge/sdk";

let _client: ReturnType<typeof createClient> | null = null;

export function authClient() {
  if (_client) return _client;
  _client = createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_BASE_URL as string,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY as string,
  });
  return _client;
}

export type AuthUser = { id: string; email: string; name?: string };

export async function signUp(email: string, password: string, name?: string) {
  const { data, error } = await authClient().auth.signUp({ email, password, name });
  if (error) throw new Error(error.message || "Sign up failed");
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await authClient().auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message || "Sign in failed");
  return data;
}

export async function signOut() {
  await authClient().auth.signOut();
}

export async function currentUser(): Promise<AuthUser | null> {
  try {
    const { data } = await authClient().auth.getCurrentUser();
    if (data?.user) {
      return { id: data.user.id, email: data.user.email, name: (data.user as any).name };
    }
  } catch {
    /* not signed in */
  }
  return null;
}

// The access token to send to our API so the server knows who's asking.
export async function accessToken(): Promise<string | null> {
  try {
    const { data } = await authClient().auth.getCurrentUser();
    return (data as any)?.accessToken ?? null;
  } catch {
    return null;
  }
}
