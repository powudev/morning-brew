import { expect, test, type Page } from "./support/fixtures";
import { TURNSTILE_FAIL_PORT } from "../../playwright.config";
import { localSupabase } from "./support/local-supabase";
import {
  concurrencyDay,
  concurrencySlotId,
  dateFor,
  E2E_EMAIL_DOMAIN,
  fixtureSlots,
  laneDate,
  laneFor,
  sql,
} from "./support/db";
import { eachLocale, getDictionary, interpolateForTest, localePath } from "./support/i18n";

// seed 的一般時段(07:00 以後、有名額);06:xx 是 E2E 專用的小容量時段
const regularSlot = (locale: Parameters<typeof getDictionary>[0]) =>
  new RegExp(`^(0[7-9]|1\\d):\\d\\d${interpolateForTest(getDictionary(locale).form.slotRemaining, "")}`);
// Next.js 的 route announcer 也是 role=alert,只看 main 裡的
const formAlert = (page: Page) => page.getByRole("main").getByRole("alert");

const emailFor = (label: string, project: string) => `${label}-${project}-${Date.now()}@${E2E_EMAIL_DOMAIN}`;

async function fillForm(
  page: Page,
  labels: ReturnType<typeof getDictionary>["form"]["labels"],
  { email, date, slot }: { email: string; date: string; slot: RegExp },
) {
  await page.getByLabel(labels.name).fill("E2E 測試");
  await page.getByLabel(labels.email).fill(email);
  await page.getByLabel(labels.date).fill(date);
  await page.getByRole("radio", { name: slot }).first().check();
}

// Turnstile 測試 site key 會自動通過;等 token 寫入隱藏欄位
async function waitForTurnstile(page: Page) {
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, { timeout: 15_000 });
}

eachLocale((locale) => {
  const f = getDictionary(locale).form;
  const url = (path: string) => localePath(locale, path);
  const submit = (page: Page) => page.getByRole("button", { name: f.submit });

  test.describe(`[${locale}] 訂位表單`, () => {
    test("成功訂位:前往該語系完成頁,資料庫新增一筆 pending 訂位", async ({ page }, testInfo) => {
      const lane = laneFor(testInfo.project.name, locale);
      const email = emailFor(`ok-${locale}`, testInfo.project.name);
      await page.goto(url("/reserve/"));
      await fillForm(page, f.labels, { email, date: laneDate(lane), slot: regularSlot(locale) });
      await page.getByLabel(f.labels.partySize).selectOption("3");
      await page.getByLabel(f.labels.note).fill("E2E note");
      await waitForTurnstile(page);
      await submit(page).click();

      await expect(page).toHaveURL(new RegExp(`${url("/reserve/done/")}$`));
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(getDictionary(locale).done.title);
      expect(sql(`select status || ',' || party_size || ',' || note from public.reservations where email = '${email}'`)).toBe(
        "pending,3,E2E note",
      );
    });

    test("欄位錯誤:顯示該語系訊息、聚焦第一個錯誤欄位,不送出", async ({ page }) => {
      let posted = false;
      page.on("request", (req) => {
        if (req.url().includes("/api/reserve")) posted = true;
      });
      await page.goto(url("/reserve/"));
      await page.getByLabel(f.labels.email).fill("not-an-email");
      await submit(page).click();

      await expect(page.getByText(f.errors.name_required)).toBeVisible();
      await expect(page.getByText(f.errors.email_invalid)).toBeVisible();
      await expect(page.getByText(f.errors.slot_required)).toBeVisible();
      await expect(page.getByLabel(f.labels.name)).toBeFocused();
      await expect(page.getByLabel(f.labels.name)).toHaveAttribute("aria-invalid", "true");
      expect(posted).toBe(false);
    });

    test("已額滿的時段不可選", async ({ page }, testInfo) => {
      await page.goto(url("/reserve/"));
      await page.getByLabel(f.labels.date).fill(laneDate(laneFor(testInfo.project.name, locale)));
      await expect(page.getByRole("radio", { name: new RegExp(`^${interpolateForTest(f.slotFull, "06:30")}`) })).toBeDisabled();
    });

    test("額滿:選好時段後被別人訂走,送出時顯示訊息並更新名額", async ({ page }, testInfo) => {
      const project = testInfo.project.name;
      const lane = laneFor(project, locale);
      const date = laneDate(lane);
      const { small } = fixtureSlots(lane);
      await page.goto(url("/reserve/"));
      await fillForm(page, f.labels, {
        email: emailFor(`full-${locale}`, project),
        date,
        slot: new RegExp(`^06:00${interpolateForTest(f.slotRemaining, "")}`),
      });
      await waitForTurnstile(page);

      // 另一位顧客搶先訂走 1 位,剩 1 位 < 2 人
      sql(`insert into public.reservations (slot_id, reservation_date, name, email, party_size)
           values (${small}, '${date}', 'E2E race', 'race-${lane}@${E2E_EMAIL_DOMAIN}', 1)`);
      await submit(page).click();

      await expect(formAlert(page)).toContainText(f.server.SLOT_FULL);
      await expect(page.getByRole("radio", { name: new RegExp(`^${interpolateForTest(f.slotNotEnough, "06:00")}`) })).toBeDisabled();
      await expect(page).toHaveURL(new RegExp(`${url("/reserve/")}$`));
    });

    test("Turnstile 伺服器驗證失敗:顯示該語系訊息,不寫入資料庫", async ({ page }, testInfo) => {
      const email = emailFor(`turnstile-${locale}`, testInfo.project.name);
      await page.goto(`http://localhost:${TURNSTILE_FAIL_PORT}${url("/reserve/")}`);
      await fillForm(page, f.labels, {
        email,
        date: laneDate(laneFor(testInfo.project.name, locale)),
        slot: regularSlot(locale),
      });
      await waitForTurnstile(page);
      await submit(page).click();

      await expect(formAlert(page)).toContainText(f.server.TURNSTILE_FAILED);
      expect(sql(`select count(*) from public.reservations where email = '${email}'`)).toBe("0");
    });
  });
});

test.describe("訂位 API", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API 測試與裝置無關,只跑一次");
  });

  const validBody = (date: string) => ({
    name: "API 測試",
    email: `api@${E2E_EMAIL_DOMAIN}`,
    partySize: 1,
    date,
    slotId: 1,
  });

  test("沒有 Turnstile token 回 400,不寫入資料庫", async ({ request }) => {
    const res = await request.post("/api/reserve", { data: validBody(laneDate("desktop-en")) });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("VALIDATION");
    expect(Object.keys(body.fields)).toContain("turnstileToken");
  });

  test("偽造的 Turnstile token 被伺服器拒絕(403)", async ({ request }) => {
    const res = await request.post(`http://localhost:${TURNSTILE_FAIL_PORT}/api/reserve`, {
      data: { ...validBody(laneDate("desktop-en")), turnstileToken: "forged-token" },
    });
    expect(res.status()).toBe(403);
  });

  test("非 JSON 請求回 415", async ({ request }) => {
    const res = await request.post("/api/reserve", { headers: { "Content-Type": "text/plain" }, data: "hello" });
    expect(res.status()).toBe(415);
  });

  test("/api/slots 回傳時段;日期錯誤回 400", async ({ request }) => {
    const ok = await request.get(`/api/slots?date=${laneDate("desktop-en")}`);
    expect(ok.status()).toBe(200);
    expect(ok.headers()["cache-control"]).toBe("no-store");
    const data = await ok.json();
    expect(data.slots.length).toBeGreaterThan(0);
    expect(data.slots[0]).toEqual({ slotId: expect.any(Number), startTime: expect.stringMatching(/^\d\d:\d\d$/), remaining: expect.any(Number) });

    expect((await request.get("/api/slots?date=1999-01-01")).status()).toBe(400);
    expect((await request.get("/api/slots")).status()).toBe(400);
  });

  test("並發:同時 10 筆訂位搶容量 4 的時段,只有 4 筆成功(不超賣)", async () => {
    const { url, serviceKey } = localSupabase();
    const date = dateFor(concurrencyDay);
    const attempts = Array.from({ length: 10 }, (_, i) =>
      fetch(`${url}/rest/v1/rpc/create_reservation`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({
          p_slot_id: concurrencySlotId,
          p_date: date,
          p_name: `並發 ${i}`,
          p_email: `concurrent-${i}@${E2E_EMAIL_DOMAIN}`,
          p_party_size: 1,
        }),
      }).then(async (res) => ({ status: res.status, body: await res.json() })),
    );
    const results = await Promise.all(attempts);
    expect(results.filter((r) => r.status === 200)).toHaveLength(4);
    const rejected = results.filter((r) => r.status !== 200);
    expect(rejected).toHaveLength(6);
    for (const r of rejected) expect(r.body.message).toBe("SLOT_FULL");
    expect(sql(`select sum(party_size) from public.reservations where slot_id = ${concurrencySlotId}`)).toBe("4");
  });
});
