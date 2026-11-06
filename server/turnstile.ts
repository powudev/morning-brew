export const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** 回傳 token 是否有效;Turnstile 服務異常時丟出錯誤(呼叫端拒絕請求,fail closed) */
export async function verifyTurnstile(
  secret: string,
  token: string,
  remoteIp: string | null,
  fetchImpl: typeof fetch,
): Promise<boolean> {
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);
  const res = await fetchImpl(TURNSTILE_VERIFY_URL, { method: "POST", body });
  if (!res.ok) throw new Error(`turnstile siteverify HTTP ${res.status}`);
  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
}
