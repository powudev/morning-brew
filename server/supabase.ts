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
