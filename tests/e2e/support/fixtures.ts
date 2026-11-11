import { expect, test as base } from "@playwright/test";

export { expect };
export type { Page } from "@playwright/test";

const PREFIX = "[csp-violation]";

export const test = base.extend<{ cspViolations: string[] }>({
  cspViolations: [
    async ({ page }, use) => {
      const violations: string[] = [];
      page.on("console", (msg) => {
        if (msg.text().startsWith(PREFIX)) violations.push(msg.text().slice(PREFIX.length + 1));
      });
      await page.addInitScript((prefix) => {
        if (window !== window.top) return;
        document.addEventListener("securitypolicyviolation", (e) => {
          console.error(`${prefix} ${e.effectiveDirective} ${e.blockedURI || "(inline)"}`);
        });
      }, PREFIX);
      await use(violations);
      expect(violations, "page should not trigger CSP violations").toEqual([]);
    },
    { auto: true },
  ],
});
