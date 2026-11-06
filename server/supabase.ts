// 以 service role 呼叫 PostgREST RPC。只在 Pages Function(伺服器端)使用,金鑰不進前端。

export type SupabaseEnv = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

export type RpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code?: string; message?: string };

function authHeaders(key: string): Record<string, string> {
  // 新版 sb_secret_ 金鑰只能放 apikey;舊版 JWT 金鑰同時放 Authorization
  return key.startsWith("eyJ") ? { apikey: key, Authorization: `Bearer ${key}` } : { apikey: key };
}

/** 網路錯誤會直接丟出,由呼叫端轉成 503 */
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
