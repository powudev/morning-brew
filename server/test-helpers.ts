import { vi } from "vitest";

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: "http://supabase.test",
  SUPABASE_SERVICE_ROLE_KEY: "service-key",
  TURNSTILE_SECRET_KEY: "turnstile-secret",
};

type Route = (init: RequestInit | undefined) => Response | Promise<Response>;

// 依網址前綴回應的假 fetch;未定義的網址直接丟錯,確保測試不會打到真實網路
export function mockFetch(routes: Record<string, Route>) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const key = Object.keys(routes).find((prefix) => url.startsWith(prefix));
    if (!key) throw new Error(`unexpected fetch: ${url}`);
    return routes[key](init);
  });
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const TURNSTILE_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export const RPC_URL = (fn: string) => `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${fn}`;
