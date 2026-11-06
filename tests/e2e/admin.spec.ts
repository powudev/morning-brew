import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { adminDate, adminSlots, CUSTOMER_EMAIL, E2E_EMAIL_DOMAIN, sql, STAFF_EMAIL } from "./support/db";

const password = () => process.env.E2E_USER_PASSWORD ?? "";

async function signIn(page: Page, email: string, pass = password()) {
  await page.goto("/admin/login/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(pass);
  await page.getByRole("button", { name: "Sign in" }).click();
}

const axe = (page: Page) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

test.describe("後台:權限", () => {
  test("未登入進 /admin/ 被導回登入頁", async ({ page }) => {
    await page.goto("/admin/");
    await expect(page).toHaveURL(/\/admin\/login\/$/);
    await expect(page.getByRole("heading", { level: 1, name: "Staff sign in" })).toBeVisible();
  });

  test("密碼錯誤顯示訊息,留在登入頁", async ({ page }) => {
    await signIn(page, STAFF_EMAIL, "wrong-password");
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("Incorrect email or password.");
    await expect(page).toHaveURL(/\/admin\/login\/$/);
  });

  test("非 staff 帳號被拒,session 被清除", async ({ page }) => {
    await signIn(page, CUSTOMER_EMAIL);
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("This account doesn't have staff access.");
    await page.goto("/admin/");
    await expect(page).toHaveURL(/\/admin\/login\/$/);
  });

  test("登入頁沒有 WCAG 2.1 AA 違規", async ({ page }) => {
    await page.goto("/admin/login/");
    expect((await axe(page)).violations.map((v) => v.id)).toEqual([]);
  });
});

test.describe("後台:staff", () => {
  test("登入 → 依日期查看訂位 → 確認訂位(寫入資料庫,重新整理後仍在)→ 登出", async ({ page }, testInfo) => {
    const date = adminDate(testInfo.project.name);
    const { early } = adminSlots(testInfo.project.name);
    const name = `Admin E2E ${testInfo.project.name}`;
    const email = `admin-${testInfo.project.name}@${E2E_EMAIL_DOMAIN}`;
    sql(`insert into public.reservations (slot_id, reservation_date, name, email, party_size, note)
         values (${early}, '${date}', '${name}', '${email}', 2, 'E2E admin note')`);

    await signIn(page, STAFF_EMAIL);
    await expect(page).toHaveURL(/\/admin\/$/);
    await expect(page.getByRole("heading", { level: 1, name: "Reservations" })).toBeVisible();

    await page.getByLabel("Date").fill(date);
    const item = page.getByRole("listitem", { name });
    await expect(item).toContainText("06:00");
    await expect(item).toContainText("2 guests");
    await expect(item).toContainText("E2E admin note");
    await expect(item).toContainText("Pending");

    expect((await axe(page)).violations.map((v) => v.id)).toEqual([]);

    await item.getByRole("button", { name: `Confirm reservation for ${name} at 06:00` }).click();
    await expect(item).toContainText("Confirmed");
    await expect.poll(() => sql(`select status from public.reservations where email = '${email}'`)).toBe("confirmed");

    await page.reload();
    await page.getByLabel("Date").fill(date);
    await expect(page.getByRole("listitem", { name })).toContainText("Confirmed");

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/login\/$/);
    await page.goto("/admin/");
    await expect(page).toHaveURL(/\/admin\/login\/$/);
  });

  test("狀態篩選只顯示該狀態", async ({ page }, testInfo) => {
    const date = adminDate(testInfo.project.name);
    const { early, late } = adminSlots(testInfo.project.name);
    const tag = `Filter ${testInfo.project.name}`;
    sql(`insert into public.reservations (slot_id, reservation_date, name, email, party_size, status) values
         (${early}, '${date}', '${tag} P', 'fp-${testInfo.project.name}@${E2E_EMAIL_DOMAIN}', 1, 'pending'),
         (${late}, '${date}', '${tag} C', 'fc-${testInfo.project.name}@${E2E_EMAIL_DOMAIN}', 1, 'cancelled')`);

    await signIn(page, STAFF_EMAIL);
    await expect(page).toHaveURL(/\/admin\/$/);
    await page.getByLabel("Date").fill(date);
    await expect(page.getByRole("listitem", { name: `${tag} C` })).toBeVisible();
    await page.getByLabel("Status").selectOption("cancelled");
    await expect(page.getByRole("listitem", { name: `${tag} C` })).toBeVisible();
    await expect(page.getByRole("listitem", { name: `${tag} P` })).toHaveCount(0);
  });
});
