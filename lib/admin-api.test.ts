import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createAdminApi, NOTIFY_CONFIRMED_PATH } from "@/lib/admin-api";

const clientWith = (token: string | null) =>
  ({
    auth: { getSession: async () => ({ data: { session: token ? { access_token: token, user: { id: "u" } } : null } }) },
  }) as unknown as SupabaseClient;

const reply = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

describe("notifyConfirmed", () => {
  it("posts the id with the staff access token and reports sent", async () => {
    const fetch = reply(200, { sent: true });
    expect(await createAdminApi(clientWith("jwt"), fetch).notifyConfirmed("r1")).toBe("sent");
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(NOTIFY_CONFIRMED_PATH);
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer jwt");
    expect(JSON.parse(init.body as string)).toEqual({ id: "r1" });
  });

  it("sent=false is skipped (email off, already sent)", async () => {
    expect(await createAdminApi(clientWith("jwt"), reply(200, { sent: false })).notifyConfirmed("r1")).toBe("skipped");
  });

  it.each([
    ["server error", reply(502, { error: "EMAIL_FAILED" })],
    ["network error", vi.fn(async () => Promise.reject(new TypeError("fetch failed")))],
  ])("%s is failed (never throws)", async (_l, fetch) => {
    expect(await createAdminApi(clientWith("jwt"), fetch as unknown as typeof globalThis.fetch).notifyConfirmed("r1")).toBe(
      "failed",
    );
  });

  it("no session: failed without calling the server", async () => {
    const fetch = reply(200, { sent: true });
    expect(await createAdminApi(clientWith(null), fetch).notifyConfirmed("r1")).toBe("failed");
    expect(fetch).not.toHaveBeenCalled();
  });
});
