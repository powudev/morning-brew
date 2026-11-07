// _headers 不套用在 Pages Function 的回應上,API 的安全標頭在這裡固定,呼叫端不能覆蓋
const SECURITY_HEADERS = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

export function jsonResponse(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers, ...SECURITY_HEADERS },
  });
}
