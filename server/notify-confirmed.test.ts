import { afterEach, describe, expect, it, vi } from "vitest";
import { handleNotifyConfirmed } from "@/server/notify-confirmed";
import { env, json, mockFetch } from "@/server/test-helpers";

const ID = "11111111-2222-3333-4444-555555555555";
const USER_URL = `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`;
const STAFF_URL = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/staff`;
const RES_URL = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/reservations`;
const MAIL_URL = "http://mail.test/emails";
const emailEnv = { ...env, RESEND_API_KEY: "re_test", EMAIL_FROM: "Demo <demo@powu.test>", EMAIL_API_URL: "http://mail.test" };

const claimed = {
  name: "Demo Guest",
  email: "guest@example.com",
  reservation_date: "2099-03-03",
  party_size: 2,
  time_slots: { start_time: "08:30:00" },
};

function post(payload: unknown = { id: ID }, headers: Record<string, string> = { Authorization: "Bearer user-jwt" }) {
  return new Request("https://brew.test/api/admin/notify-confirmed", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
}

const routes = (over: Parameters<typeof mockFetch>[0] = {}) => ({
  [USER_URL]: () => json({ id: "staff-user" }),
  [STAFF_URL]: () => json([{ user_id: "staff-user" }]),
  [RES_URL]: (init: RequestInit | undefined) =>
    JSON.parse(init!.body as string).confirmed_email_sent_at ? json([claimed]) : json([]),
  [MAIL_URL]: () => json({ id: "e1" }),
  ...over,
});

async function call(fetch: ReturnType<typeof mockFetch>, request = post(), e: typeof emailEnv | typeof env = emailEnv) {
  const res = await handleNotifyConfirmed(request, e, fetch);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}
const urls = (fetch: ReturnType<typeof mockFetch>) => fetch.mock.calls.map(([u, init]) => `${init?.method ?? "GET"} ${String(u)}`);

afterEach(() => vi.restoreAllMocks());

describe("handleNotifyConfirmed: who may call it", () => {
  it("401 without a bearer token; nothing else is called", async () => {
    const fetch = mockFetch(routes());
    expect(await call(fetch, post({ id: ID }, {}))).toEqual({ status: 401, body: { error: "UNAUTHORIZED" } });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("401 when Supabase Auth rejects the token", async () => {
    const fetch = mockFetch(routes({ [USER_URL]: () => json({ msg: "bad jwt" }, 401) }));
    expect(await call(fetch)).toEqual({ status: 401, body: { error: "UNAUTHORIZED" } });
    expect(urls(fetch)).toEqual([`GET ${USER_URL}`]);
  });

  it("verifies the token with Supabase Auth (service apikey + the user's bearer token)", async () => {
    const fetch = mockFetch(routes());
    await call(fetch);
    const headers = new Headers(fetch.mock.calls[0][1]!.headers);
    expect(headers.get("apikey")).toBe("service-key");
    expect(headers.get("authorization")).toBe("Bearer user-jwt");
  });

  it("403 for a signed-in user who is not staff; no email, no database write", async () => {
    const fetch = mockFetch(routes({ [STAFF_URL]: () => json([]) }));
    expect(await call(fetch)).toEqual({ status: 403, body: { error: "FORBIDDEN" } });
    expect(String(fetch.mock.calls[1][0])).toBe(`${STAFF_URL}?user_id=eq.staff-user&select=user_id`);
    expect(urls(fetch).some((u) => u.startsWith("PATCH") || u.includes(MAIL_URL))).toBe(false);
  });
});

describe("handleNotifyConfirmed: request format", () => {
  it("415 for a non-JSON body", async () => {
    const fetch = mockFetch(routes());
    const req = new Request("https://brew.test/x", { method: "POST", headers: { Authorization: "Bearer t" }, body: "id" });
    expect((await call(fetch, req)).status).toBe(415);
  });

  it.each([["not json", "{"], ["missing id", {}], ["not a uuid", { id: "1 or 1=1" }]])("400 for %s", async (_l, payload) => {
    const fetch = mockFetch(routes());
    expect((await call(fetch, post(payload))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("500 when Supabase settings are missing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetch = mockFetch(routes());
    expect((await call(fetch, post(), { ...emailEnv, SUPABASE_SERVICE_ROLE_KEY: "" })).status).toBe(500);
  });
});

describe("handleNotifyConfirmed: sending", () => {
  it("claims the reservation atomically (confirmed and not yet emailed), then sends the confirmed email", async () => {
    const fetch = mockFetch(routes());
    expect(await call(fetch)).toEqual({ status: 200, body: { sent: true } });

    const patch = fetch.mock.calls.find(([, init]) => init?.method === "PATCH")!;
    expect(String(patch[0])).toBe(
      `${RES_URL}?id=eq.${ID}&status=eq.confirmed&confirmed_email_sent_at=is.null` +
        "&select=name,email,reservation_date,party_size,time_slots(start_time)",
    );
    const headers = new Headers(patch[1]!.headers);
    expect(headers.get("apikey")).toBe("service-key");
    expect(headers.get("prefer")).toBe("return=representation");

    const mail = fetch.mock.calls.find(([u]) => String(u) === MAIL_URL)!;
    const sent = JSON.parse(mail[1]!.body as string) as { to: string[]; subject: string; text: string };
    expect(sent.to).toEqual(["guest@example.com"]);
    expect(sent.subject).toMatch(/confirmed/);
    expect(sent.text).toContain("08:30");
    expect(new Headers(mail[1]!.headers).get("idempotency-key")).toBe(`confirmed/${ID}`);
  });

  it("nothing to send (not confirmed, already emailed or unknown id): 200 sent=false, no email", async () => {
    const fetch = mockFetch(routes({ [RES_URL]: () => json([]) }));
    expect(await call(fetch)).toEqual({ status: 200, body: { sent: false, reason: "NOTHING_TO_SEND" } });
    expect(urls(fetch).some((u) => u.includes(MAIL_URL))).toBe(false);
  });

  it("email not configured: 200 sent=false without calling Supabase at all (dashboard shows no error)", async () => {
    const fetch = mockFetch(routes());
    expect(await call(fetch, post(), env)).toEqual({ status: 200, body: { sent: false, reason: "EMAIL_DISABLED" } });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("email not configured still requires a bearer token", async () => {
    const fetch = mockFetch(routes());
    expect((await call(fetch, post({ id: ID }, {}), env)).status).toBe(401);
  });

  it("email provider fails: the claim is released so it can be retried, 502", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetch = mockFetch(routes({ [MAIL_URL]: () => json({}, 500) }));
    expect(await call(fetch)).toEqual({ status: 502, body: { error: "EMAIL_FAILED" } });
    const patches = fetch.mock.calls.filter(([, init]) => init?.method === "PATCH");
    expect(patches).toHaveLength(2);
    expect(String(patches[1][0])).toBe(`${RES_URL}?id=eq.${ID}`);
    expect(JSON.parse(patches[1][1]!.body as string)).toEqual({ confirmed_email_sent_at: null });
  });

  it("Supabase unreachable: 503", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetch = mockFetch(routes({ [STAFF_URL]: () => Promise.reject(new Error("down")) }));
    expect((await call(fetch)).status).toBe(503);
  });
});
