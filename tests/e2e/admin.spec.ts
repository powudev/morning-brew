import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "./support/fixtures";
import { adminDate, adminSlots, CUSTOMER_EMAIL, E2E_EMAIL_DOMAIN, sql, STAFF_EMAIL, uiSlotDate } from "./support/db";

const password = () => process.env.E2E_USER_PASSWORD ?? "";

async function signIn(page: Page, email: string, pass = password()) {
  await page.goto("/admin/login/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(pass);
  await page.getByRole("button", { name: "Sign in" }).click();
}

const axe = (page: Page) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

test.describe("staff area: access", () => {
  test("signed-out visit to /admin/slots/ redirects to sign-in", async ({ page }) => {
    await page.goto("/admin/slots/");
    await expect(page).toHaveURL(/\/admin\/login\/$/);
  });

  test("signed-out visit to /admin/ redirects to sign-in", async ({ page }) => {
    await page.goto("/admin/");
    await expect(page).toHaveURL(/\/admin\/login\/$/);
    await expect(page.getByRole("heading", { level: 1, name: "Staff sign in" })).toBeVisible();
  });

  test("wrong password shows a message and stays on sign-in", async ({ page }) => {
    await signIn(page, STAFF_EMAIL, "wrong-password");
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("Incorrect email or password.");
    await expect(page).toHaveURL(/\/admin\/login\/$/);
  });

  test("non-staff account is refused and its session cleared", async ({ page }) => {
    await signIn(page, CUSTOMER_EMAIL);
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("This account doesn't have staff access.");
    await page.goto("/admin/");
    await expect(page).toHaveURL(/\/admin\/login\/$/);
  });

  test("sign-in page has no WCAG 2.1 AA violations", async ({ page }) => {
    await page.goto("/admin/login/");
    expect((await axe(page)).violations.map((v) => v.id)).toEqual([]);
  });
});

test.describe("staff area: staff", () => {
  test("sign in → view bookings by date → confirm one (saved, survives reload) → sign out", async ({ page }, testInfo) => {
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

  test("status filter shows only that status", async ({ page }, testInfo) => {
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

test.describe("staff area: time slots", () => {
  type Slot = { startTime: string; remaining: number };
  const publicSlots = async (page: Page, date: string): Promise<Slot[]> =>
    ((await (await page.request.get(`/api/slots?date=${date}`)).json()) as { slots: Slot[] }).slots;

  test("capacity and deactivation change what the public booking form offers", async ({ page }, testInfo) => {
    const date = adminDate(testInfo.project.name);
    const { managed } = adminSlots(testInfo.project.name);
    const label = `${date} 07:00`;

    await signIn(page, STAFF_EMAIL);
    await expect(page).toHaveURL(/\/admin\/$/);
    await page.getByRole("link", { name: "Time slots" }).click();
    await expect(page).toHaveURL(/\/admin\/slots\/$/);
    await expect(page.getByRole("heading", { level: 1, name: "Time slots" })).toBeVisible();
    expect((await axe(page)).violations.map((v) => v.id)).toEqual([]);

    const row = page.getByRole("listitem", { name: label });
    await row.getByLabel(`Capacity for ${label}`, { exact: true }).fill("7");
    await row.getByRole("button", { name: `Save capacity for ${label}` }).click();
    await expect(page.getByRole("status")).toHaveText(`Saved ${label}.`);
    await expect.poll(() => sql(`select capacity from public.time_slots where id = ${managed}`)).toBe("7");
    expect((await publicSlots(page, date)).find((x) => x.startTime === "07:00")?.remaining).toBe(7);

    await row.getByRole("button", { name: `Deactivate ${label}` }).click();
    await expect(row).toContainText("Inactive");
    await expect.poll(async () => (await publicSlots(page, date)).some((x) => x.startTime === "07:00")).toBe(false);

    await row.getByRole("button", { name: `Activate ${label}` }).click();
    await expect(row).toContainText("Active");
    await expect.poll(async () => (await publicSlots(page, date)).some((x) => x.startTime === "07:00")).toBe(true);
  });

  test("add a date-specific slot; adding it twice is refused", async ({ page }, testInfo) => {
    const date = uiSlotDate(testInfo.project.name);
    await signIn(page, STAFF_EMAIL);
    await expect(page).toHaveURL(/\/admin\/$/);
    await page.goto("/admin/slots/");

    const form = page.getByRole("form", { name: "Add a time slot" });
    const fill = async () => {
      await form.getByLabel("Specific date").check();
      await form.getByLabel("Date", { exact: true }).fill(date);
      await form.getByLabel("Start time").fill("09:15");
      await form.getByLabel("Capacity", { exact: true }).fill("3");
      await form.getByRole("button", { name: "Add slot" }).click();
    };
    await fill();
    await expect(page.getByRole("listitem", { name: `${date} 09:15` })).toContainText("Active");
    expect(sql(`select capacity || ',' || is_active from public.time_slots where slot_date = '${date}'`)).toBe("3,true");

    await page.reload();
    await expect(page.getByRole("listitem", { name: `${date} 09:15` })).toBeVisible();
    await fill();
    await expect(form.getByRole("alert")).toHaveText("A slot already exists at that time.");
  });
});
