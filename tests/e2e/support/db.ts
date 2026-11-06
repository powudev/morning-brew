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

// 每個「裝置 project × 語系」用不同日期與專用時段,平行執行時互不影響
export type Lane = `${"desktop" | "mobile"}-${"en" | "zh-tw"}`;
const laneDays: Record<string, number> = { "desktop-en": 5, "desktop-zh-tw": 6, "mobile-en": 8, "mobile-zh-tw": 9 };
const laneBase: Record<string, number> = {
  "desktop-en": 990000,
  "desktop-zh-tw": 990100,
  "mobile-en": 990200,
  "mobile-zh-tw": 990300,
};
export const lanes = Object.keys(laneDays);
export const laneFor = (project: string, locale: string) => `${project}-${locale}`;
export const laneDate = (lane: string) => dateFor(laneDays[lane]);
export const concurrencyDay = 7;

export const dateFor = (days: number) => addDays(todayInTaipei(), days);

// E2E 專用時段 id(990000 起),每條 lane 兩個:06:00 容量 2、06:30 已額滿
export const fixtureSlots = (lane: string) => ({ small: laneBase[lane] + 1, full: laneBase[lane] + 2 });
export const concurrencySlotId = 990900;

export function cleanup(): void {
  sql(`
    delete from public.reservations where email like '%@${E2E_EMAIL_DOMAIN}' or slot_id >= 990000;
    delete from public.time_slots where id >= 990000;
  `);
}

export function seedFixtures(): void {
  const rows: string[] = [];
  for (const lane of lanes) {
    const { small, full } = fixtureSlots(lane);
    const d = laneDate(lane);
    rows.push(`(${small}, '${d}', '06:00', 2)`, `(${full}, '${d}', '06:30', 1)`);
  }
  rows.push(`(${concurrencySlotId}, '${dateFor(concurrencyDay)}', '06:00', 4)`);
  sql(`
    insert into public.time_slots (id, slot_date, start_time, capacity) overriding system value
    values ${rows.join(",\n")};
    insert into public.reservations (slot_id, reservation_date, name, email, party_size)
    select id, slot_date, 'E2E full', 'prefill@${E2E_EMAIL_DOMAIN}', 1
    from public.time_slots where id in (${lanes.map((l) => fixtureSlots(l).full).join(",")});
  `);
}
