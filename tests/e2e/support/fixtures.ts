import { expect, test as base } from "@playwright/test";

export { expect };
export type { Page } from "@playwright/test";

const PREFIX = "[csp-violation]";

/**
 * 所有 E2E 都經過這個 fixture:頁面(最上層文件)只要觸發任何 CSP 違規,測試就失敗。
 * 正常流程(Turnstile、地圖、後台連 Supabase)因此全部在正式的 CSP 下驗證。
 * 刻意觸發違規的測試要自行檢查後清空 cspViolations。
 */
export const test = base.extend<{ cspViolations: string[] }>({
  cspViolations: [
    async ({ page }, use) => {
      const violations: string[] = [];
      page.on("console", (msg) => {
        if (msg.text().startsWith(PREFIX)) violations.push(msg.text().slice(PREFIX.length + 1));
      });
      await page.addInitScript((prefix) => {
        if (window !== window.top) return; // 第三方 iframe 自己的 CSP 不歸我們管
        document.addEventListener("securitypolicyviolation", (e) => {
          console.error(`${prefix} ${e.effectiveDirective} ${e.blockedURI || "(inline)"}`);
        });
      }, PREFIX);
      await use(violations);
      expect(violations, "頁面不應觸發 CSP 違規").toEqual([]);
    },
    { auto: true },
  ],
});
