import { execFileSync } from "node:child_process";
import { addDays, todayInTaipei } from "../../../lib/dates";

// 透過本機 Supabase 的 DB 容器執行 SQL(只用在測試的資料準備與檢查)
export function sql(query: string): string {
  return execFileSync(
    "docker",
    ["exec", "-i", "supabase_db_morning-brew", "psql", "-U", "postgres", "-At", "-q", "-v", "ON_ERROR_STOP=1"],
    { input: query, encoding: "utf8" },
  ).trim();
}

export const E2E_EMAIL_DOMAIN = "e2e.test";

// 每個 Playwright project 用不同日期,平行執行時互不影響
export const projectDays: Record<string, number> = { desktop: 5, mobile: 6 };
export const concurrencyDay = 7;

export const dateFor = (days: number) => addDays(todayInTaipei(), days);

// E2E 專用時段 id(990000 起),每個 project 兩個:一個容量 2、一個已額滿
export const fixtureSlots = (project: string) => {
  const base = project === "mobile" ? 990100 : 990000;
  return { small: base + 1, full: base + 2 };
};
export const concurrencySlotId = 990900;

export function cleanup(): void {
  sql(`
    delete from public.reservations where email like '%@${E2E_EMAIL_DOMAIN}' or slot_id >= 990000;
    delete from public.time_slots where id >= 990000;
  `);
}

export function seedFixtures(): void {
  const rows: string[] = [];
  for (const [project, days] of Object.entries(projectDays)) {
    const { small, full } = fixtureSlots(project);
    const d = dateFor(days);
    rows.push(`(${small}, '${d}', '06:00', 2)`, `(${full}, '${d}', '06:30', 1)`);
  }
  rows.push(`(${concurrencySlotId}, '${dateFor(concurrencyDay)}', '06:00', 4)`);
  sql(`
    insert into public.time_slots (id, slot_date, start_time, capacity) overriding system value
    values ${rows.join(",\n")};
    insert into public.reservations (slot_id, reservation_date, name, email, party_size)
    select id, slot_date, 'E2E 已滿', 'prefill@${E2E_EMAIL_DOMAIN}', 1
    from public.time_slots where id in (${Object.keys(projectDays).map((p) => fixtureSlots(p).full).join(",")});
  `);
}
