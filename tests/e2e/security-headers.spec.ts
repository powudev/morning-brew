import { expect, test } from "./support/fixtures";
import { localePath, locales } from "./support/i18n";

const publicPaths = ["/", "/menu/", "/about/", "/reserve/", "/reserve/done/", "/privacy/"];
const pages = [
  ...locales.flatMap((l) => publicPaths.map((p) => localePath(l, p))),
  "/admin/login/",
  "/admin/",
  "/no-such-page/",
];

function directive(policy: string, name: string): string[] | undefined {
  const part = policy
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${name} `) || p === name);
  return part?.split(/\s+/).slice(1);
}

test.describe("安全標頭", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "HTTP 標頭與裝置無關,只跑一次");
  });

  for (const path of pages) {
    test(`${path}:回應帶安全標頭`, async ({ request }) => {
      const res = await request.get(path);
      const h = res.headers();
      expect(h["x-content-type-options"]).toBe("nosniff");
      expect(h["x-frame-options"]).toBe("DENY");
      expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
      expect(h["permissions-policy"]).toContain("camera=()");
      expect(h["strict-transport-security"]).toMatch(/max-age=\d{7,}/);
      const csp = h["content-security-policy"] ?? "";
      expect(directive(csp, "frame-ancestors")).toEqual(["'none'"]);
      expect(directive(csp, "object-src")).toEqual(["'none'"]);
      expect(directive(csp, "base-uri")).toEqual(["'self'"]);
    });
  }

  test("後台頁面不快取、不被索引", async ({ request }) => {
    for (const path of ["/admin/", "/admin/login/"]) {
      const h = (await request.get(path)).headers();
      expect(h["cache-control"], path).toBe("no-store");
      expect(h["x-robots-tag"], path).toBe("noindex, nofollow");
    }
  });

  test("API 回應不快取、不允許 MIME sniffing", async ({ request }) => {
    const res = await request.get("/api/slots?date=2099-01-01");
    const h = res.headers();
    expect(h["cache-control"]).toBe("no-store");
    expect(h["x-content-type-options"]).toBe("nosniff");
  });
});

test.describe("CSP(script 只允許自己的檔案與逐頁 hash)", () => {
  for (const path of pages) {
    test(`${path}:有 CSP meta,script-src 不含 unsafe-inline / unsafe-eval`, async ({ page }) => {
      await page.goto(path);
      const policy = await page
        .locator('meta[http-equiv="Content-Security-Policy"]')
        .getAttribute("content");
      expect(policy).toBeTruthy();
      const scriptSrc = directive(policy!, "script-src") ?? [];
      expect(scriptSrc).toContain("'self'");
      expect(scriptSrc.some((s) => s.startsWith("'sha256-"))).toBe(true);
      expect(scriptSrc).not.toContain("'unsafe-inline'");
      expect(scriptSrc).not.toContain("'unsafe-eval'");
      expect(directive(policy!, "default-src")).toEqual(["'self'"]);
    });
  }

  test("注入的 inline script 不會執行,並回報 CSP 違規", async ({ page, cspViolations }) => {
    await page.goto("/");
    const executed = await page.evaluate(() => {
      const s = document.createElement("script");
      s.textContent = "window.__injected = true";
      document.body.appendChild(s);
      return (window as unknown as { __injected?: boolean }).__injected === true;
    });
    expect(executed).toBe(false);
    await expect.poll(() => cspViolations.some((v) => v.startsWith("script-src"))).toBe(true);
    cspViolations.length = 0;
  });

  test("外部網域的 script 被擋", async ({ page, cspViolations }) => {
    await page.goto("/");
    await page.evaluate(() => {
      const s = document.createElement("script");
      s.src = "https://evil.example.com/x.js";
      document.body.appendChild(s);
    });
    await expect
      .poll(() => cspViolations.some((v) => v.includes("https://evil.example.com/x.js")))
      .toBe(true);
    cspViolations.length = 0;
  });
});
