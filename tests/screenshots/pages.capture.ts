import { expect, test, type Page } from "@playwright/test";
import { dateFor, STAFF_EMAIL } from "../e2e/support/db";

const out = (page: Page, name: string) =>
  `docs/screenshots/${test.info().project.name}-${name}.png`;

async function shot(page: Page, name: string, fullPage = false) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out(page, name), fullPage, animations: "disabled" });
}

test("首頁(英文、繁中)", async ({ page }) => {
  await page.goto("/");
  await shot(page, "home", true);
  await page.goto("/zh-tw/");
  await shot(page, "home-zh-tw", true);
});

test("菜單", async ({ page }) => {
  await page.goto("/menu/");
  await shot(page, "menu");
});

test("訂位表單(已選日期,顯示剩餘名額)", async ({ page }) => {
  await page.goto("/reserve/");
  await page.locator('input[name="date"]').fill(dateFor(3));
  await expect(page.locator('input[name="slotId"]').first()).toBeVisible();
  await page.locator('input[name="name"]').fill("Demo Guest");
  await page.locator('input[name="email"]').fill("guest@example.com");
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, { timeout: 15_000 });
  await shot(page, "reserve", true);
});

test("後台:訂位清單", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "後台以桌機為主");
  await page.goto("/admin/login/");
  await shot(page, "admin-login");
  await page.getByLabel("Email").fill(STAFF_EMAIL);
  await page.getByLabel("Password").fill(process.env.E2E_USER_PASSWORD ?? "");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Reservations" })).toBeVisible();
  await expect(page.getByRole("listitem").first()).toBeVisible();
  await page.getByText(STAFF_EMAIL).evaluateAll((els) => els.forEach((el) => (el.textContent = "staff@example.com")));
  await shot(page, "admin-dashboard", true);
});
