import { describe, expect, it } from "vitest";
import { handleReserve } from "@/server/reserve";
import { env, json, mockFetch, RPC_URL, TURNSTILE_URL } from "@/server/test-helpers";

const body = {
  name: "王小明",
  email: "demo@example.com",
  phone: "0900-000-000",
  partySize: 2,
  date: "2026-11-10",
  slotId: 3,
  note: "靠窗",
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

describe("handleReserve:成功", () => {
  it("驗證 Turnstile 後呼叫 create_reservation,回 201", async () => {
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
      p_name: "王小明",
      p_email: "demo@example.com",
      p_party_size: 2,
      p_phone: "0900-000-000",
      p_note: "靠窗",
    });
  });

  it("新版 sb_secret_ 金鑰只放 apikey,不放 Bearer;舊版 JWT 金鑰兩者都放", async () => {
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

describe("handleReserve:請求格式", () => {
  it("非 JSON Content-Type 回 415", async () => {
    const fetch = mockFetch({});
    const res = await handleReserve(post(body, { "Content-Type": "text/plain" }), env, fetch);
    expect(res.status).toBe(415);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("超過 8KB 回 413", async () => {
    const fetch = mockFetch({});
    const res = await handleReserve(post({ ...body, note: "a".repeat(9000) }), env, fetch);
    expect(res.status).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("壞掉的 JSON 回 400", async () => {
    const res = await handleReserve(post("{oops"), env, mockFetch({}));
    expect(res.status).toBe(400);
    expect(await errorOf(res)).toBe("INVALID_JSON");
  });

  it("欄位錯誤回 400 與各欄位訊息,且不消耗 Turnstile token", async () => {
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
  it("驗證失敗回 403,不寫入資料庫", async () => {
    const fetch = mockFetch({ [TURNSTILE_URL]: () => json({ success: false, "error-codes": ["invalid-input-response"] }) });
    const res = await handleReserve(post(), env, fetch);
    expect(res.status).toBe(403);
    expect(await errorOf(res)).toBe("TURNSTILE_FAILED");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("Turnstile 服務連不上時拒絕(fail closed),回 503", async () => {
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

describe("handleReserve:資料庫錯誤對應", () => {
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

  it("其他資料庫錯誤回 500,且不洩漏內部訊息", async () => {
    const fetch = mockFetch({
      [TURNSTILE_URL]: turnstileOk,
      [RPC_URL("create_reservation")]: () => json({ code: "42P01", message: 'relation "secret_table" does not exist' }, 404),
    });
    const res = await handleReserve(post(), env, fetch);
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("secret_table");
  });

  it("資料庫連不上回 503", async () => {
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

describe("handleReserve:設定錯誤", () => {
  for (const missing of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "TURNSTILE_SECRET_KEY"] as const) {
    it(`缺少 ${missing} 時拒絕,回 500,不呼叫任何外部服務`, async () => {
      const fetch = mockFetch({});
      const res = await handleReserve(post(), { ...env, [missing]: "" }, fetch);
      expect(res.status).toBe(500);
      expect(fetch).not.toHaveBeenCalled();
    });
  }
});
