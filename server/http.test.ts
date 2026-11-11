import { describe, expect, it } from "vitest";
import { jsonResponse } from "@/server/http";

describe("jsonResponse", () => {
  it("JSON、不快取、禁止 MIME sniffing", async () => {
    const res = jsonResponse({ ok: true }, 201);
    expect(res.status).toBe(201);
    expect(res.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(await res.json()).toEqual({ ok: true });
  });

  it("可附加標頭,但不能覆蓋安全標頭", () => {
    const res = jsonResponse({}, 405, { Allow: "POST", "X-Content-Type-Options": "sniff", "Cache-Control": "max-age=60" });
    expect(res.headers.get("Allow")).toBe("POST");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
