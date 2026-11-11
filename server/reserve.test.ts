import { describe, expect, it } from "vitest";
import { handleReserve } from "@/server/reserve";
import { env, json, mockFetch, RPC_URL, TURNSTILE_URL } from "@/server/test-helpers";

const body = {
  name: "Demo Guest",
  email: "demo@example.com",
  phone: "0900-000-000",
  partySize: 2,
  date: "2026-11-10",
  slotId: 3,
  note: "window seat",
  turnstileToken: "tok",
};

function post(payload: unknown = body, headers: Record<string, string> = {}) {
  return new Request("https://brew.test/api/reserve", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.9", ...headers },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
}

const turnstileOk = () => json({ success: true });
const rpcOk = () => json("11111111-2222-3333-4444-555555555555");

async function errorOf(res: Response) {
  return ((await res.json()) as { error: string }).error;
}

describe("handleReserve: success", () => {
  it("verifies Turnstile, calls create_reservation and returns 201", async () => {
    const fetch = mockFetch({ [TURNSTILE_URL]: turnstileOk, [RPC_URL("create_reservation")]: rpcOk });
    const res = await handleReserve(post(), env, fetch);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });

    const [turnstileCall, rpcCall] = fetch.mock.calls;
    const form = turnstileCall[1]!.body as URLSearchParams;
    expect(form.get("secret")).toBe("turnstile-secret");
    expect(form.get("response")).toBe("tok");
    expect(form.get("remoteip")).toBe("203.0.113.9");

    expect(String(rpcCall[0])).toBe(RPC_URL("create_reservation"));
    const headers = new Headers(rpcCall[1]!.headers);
    expect(headers.get("apikey")).toBe("service-key");
    expect(JSON.parse(rpcCall[1]!.body as string)).toEqual({
      p_slot_id: 3,
      p_date: "2026-11-10",
      p_name: "Demo Guest",
      p_email: "demo@example.com",
      p_party_size: 2,
      p_phone: "0900-000-000",
      p_note: "window seat",
    });
  });

  it("sends new sb_secret_ keys only as apikey; legacy JWT keys also as Bearer", async () => {
    for (const [key, bearer] of [
      ["sb_secret_abc", null],
      ["eyJhbGciOiJIUzI1NiJ9.x.y", "Bearer eyJhbGciOiJIUzI1NiJ9.x.y"],
    ] as const) {
      const fetch = mockFetch({ [TURNSTILE_URL]: turnstileOk, [RPC_URL("create_reservation")]: rpcOk });
      await handleReserve(post(), { ...env, SUPABASE_SERVICE_ROLE_KEY: key }, fetch);
      const headers = new Headers(fetch.mock.calls[1][1]!.headers);
      expect(headers.get("apikey")).toBe(key);
      expect(headers.get("authorization")).toBe(bearer);
    }
  });
});

describe("handleReserve: request format", () => {
  it("returns 415 for a non-JSON Content-Type", async () => {
    const fetch = mockFetch({});
    const res = await handleReserve(post(body, { "Content-Type": "text/plain" }), env, fetch);
    expect(res.status).toBe(415);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns 413 for bodies over 8 KB", async () => {
    const fetch = mockFetch({});
    const res = await handleReserve(post({ ...body, note: "a".repeat(9000) }), env, fetch);
    expect(res.status).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON", async () => {
    const res = await handleReserve(post("{oops"), env, mockFetch({}));
    expect(res.status).toBe(400);
    expect(await errorOf(res)).toBe("INVALID_JSON");
  });

  it("returns 400 with per-field errors without spending the Turnstile token", async () => {
    const fetch = mockFetch({});
    const res = await handleReserve(post({ ...body, email: "x", partySize: 0 }), env, fetch);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string; fields: Record<string, string> };
    expect(data.error).toBe("VALIDATION");
    expect(Object.keys(data.fields).sort()).toEqual(["email", "partySize"]);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("handleReserve:Turnstile", () => {
  it("returns 403 when verification fails and writes nothing", async () => {
    const fetch = mockFetch({ [TURNSTILE_URL]: () => json({ success: false, "error-codes": ["invalid-input-response"] }) });
    const res = await handleReserve(post(), env, fetch);
    expect(res.status).toBe(403);
    expect(await errorOf(res)).toBe("TURNSTILE_FAILED");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("fails closed with 503 when Turnstile is unreachable", async () => {
    const fetch = mockFetch({
      [TURNSTILE_URL]: () => {
        throw new Error("network down");
      },
    });
    const res = await handleReserve(post(), env, fetch);
    expect(res.status).toBe(503);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("handleReserve: database error mapping", () => {
  const cases: [string, number, string][] = [
    ["SLOT_FULL", 409, "SLOT_FULL"],
    ["SLOT_NOT_AVAILABLE", 422, "SLOT_NOT_AVAILABLE"],
    ["SLOT_IN_PAST", 422, "SLOT_IN_PAST"],
    ["INVALID_DATE", 422, "INVALID_DATE"],
  ];
  for (const [message, status, error] of cases) {
    it(`${message} → ${status}`, async () => {
      const fetch = mockFetch({
        [TURNSTILE_URL]: turnstileOk,
        [RPC_URL("create_reservation")]: () => json({ code: "P0001", message }, 400),
      });
      const res = await handleReserve(post(), env, fetch);
      expect(res.status).toBe(status);
      expect(await errorOf(res)).toBe(error);
    });
  }

  it("returns 500 for other database errors without leaking details", async () => {
    const fetch = mockFetch({
      [TURNSTILE_URL]: turnstileOk,
      [RPC_URL("create_reservation")]: () => json({ code: "42P01", message: 'relation "secret_table" does not exist' }, 404),
    });
    const res = await handleReserve(post(), env, fetch);
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("secret_table");
  });

  it("returns 503 when the database is unreachable", async () => {
    const fetch = mockFetch({
      [TURNSTILE_URL]: turnstileOk,
      [RPC_URL("create_reservation")]: () => {
        throw new Error("ECONNREFUSED");
      },
    });
    const res = await handleReserve(post(), env, fetch);
    expect(res.status).toBe(503);
  });
});

describe("handleReserve: misconfiguration", () => {
  for (const missing of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "TURNSTILE_SECRET_KEY"] as const) {
    it(`returns 500 without calling external services when ${missing} is missing`, async () => {
      const fetch = mockFetch({});
      const res = await handleReserve(post(), { ...env, [missing]: "" }, fetch);
      expect(res.status).toBe(500);
      expect(fetch).not.toHaveBeenCalled();
    });
  }
});
