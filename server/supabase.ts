export type SupabaseEnv = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

export type RpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code?: string; message?: string };

function authHeaders(key: string): Record<string, string> {
  // New sb_secret_ keys go in the apikey header only; legacy JWT keys also need Authorization.
  return key.startsWith("eyJ") ? { apikey: key, Authorization: `Bearer ${key}` } : { apikey: key };
}

export async function rpc<T>(
  env: Required<SupabaseEnv>,
  fn: string,
  args: Record<string, unknown>,
  fetchImpl: typeof fetch,
): Promise<RpcResult<T>> {
  const res = await fetchImpl(`${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(env.SUPABASE_SERVICE_ROLE_KEY) },
    body: JSON.stringify(args),
  });
  const data = await res.json().catch(() => null);
  if (res.ok) return { ok: true, data: data as T };
  const err = (data ?? {}) as { code?: string; message?: string };
  return { ok: false, status: res.status, code: err.code, message: err.message };
}

/** GET rows through PostgREST with the service role. `query` is a PostgREST query string (without "?"). */
export async function selectRows<T>(
  env: Required<SupabaseEnv>,
  table: string,
  query: string,
  fetchImpl: typeof fetch,
): Promise<T[]> {
  const res = await fetchImpl(`${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${table}?${query}`, {
    headers: authHeaders(env.SUPABASE_SERVICE_ROLE_KEY),
  });
  if (!res.ok) throw new Error(`select ${table} responded ${res.status}`);
  return (await res.json()) as T[];
}

/** PATCH rows through PostgREST with the service role and return the updated rows. */
export async function patchRows<T>(
  env: Required<SupabaseEnv>,
  table: string,
  query: string,
  body: Record<string, unknown>,
  fetchImpl: typeof fetch,
): Promise<T[]> {
  const res = await fetchImpl(`${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${table}?${query}`, {
    method: "PATCH",
    headers: { ...authHeaders(env.SUPABASE_SERVICE_ROLE_KEY), "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`patch ${table} responded ${res.status}`);
  return (await res.json()) as T[];
}

/** Resolves a user's access token to their id with Supabase Auth; null if the token is not valid. */
export async function getUserId(env: Required<SupabaseEnv>, accessToken: string, fetchImpl: typeof fetch): Promise<string | null> {
  const res = await fetchImpl(`${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) throw new Error(`auth user responded ${res.status}`);
  const user = (await res.json()) as { id?: string };
  return typeof user.id === "string" ? user.id : null;
}
