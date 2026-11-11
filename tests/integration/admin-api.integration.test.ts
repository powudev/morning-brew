import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AdminApiError, createAdminApi } from "@/lib/admin-api";
import { sql } from "../e2e/support/db";
import { localSupabase } from "../e2e/support/local-supabase";

const DOMAIN = "integration.test";
const DATE = "2099-03-03";
const password = randomBytes(12).toString("hex");
const { url, anonKey, serviceKey } = localSupabase();

const newApi = () => createAdminApi(createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } }));

async function createUser(email: string): Promise<string> {
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!res.ok) throw new Error(`create user failed: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { id: string }).id;
}

function cleanup() {
  sql(`
    delete from public.reservations where email like '%@${DOMAIN}';
    delete from public.time_slots where id in (980001, 980002);
    delete from auth.users where email like '%@${DOMAIN}';
  `);
}

let ids: Record<string, string> = {};

beforeAll(async () => {
  cleanup();
  const staffId = await createUser(`staff@${DOMAIN}`);
  await createUser(`customer@${DOMAIN}`);
  sql(`
    insert into public.staff (user_id) values ('${staffId}');
    insert into public.time_slots (id, slot_date, start_time, capacity) overriding system value
      values (980001, '${DATE}', '08:00', 10), (980002, '${DATE}', '10:00', 10);
    insert into public.reservations (slot_id, reservation_date, name, email, phone, party_size, note, status, created_at) values
      (980002, '${DATE}', 'Late B', 'b@${DOMAIN}', null, 2, null, 'pending', '2099-03-01T02:00:00Z'),
      (980001, '${DATE}', 'Early A', 'a@${DOMAIN}', '0900-000-000', 3, 'window', 'confirmed', '2099-03-01T03:00:00Z'),
      (980002, '${DATE}', 'Late C', 'c@${DOMAIN}', null, 1, null, 'cancelled', '2099-03-01T04:00:00Z');
  `);
  ids = Object.fromEntries(
    sql(`select email, id from public.reservations where email like '%@${DOMAIN}'`)
      .split("\n")
      .map((line) => line.split("|")),
  );
});

afterAll(() => cleanup());

describe("signed out (anon)", () => {
  it("has no session", async () => {
    expect(await newApi().getSession()).toBeNull();
  });

  it("is not staff", async () => {
    expect(await newApi().isStaff()).toBe(false);
  });

  it("reading reservations is refused (forbidden)", async () => {
    await expect(newApi().listReservations(DATE)).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("sign in", () => {
  it("wrong password returns invalid_credentials", async () => {
    expect(await newApi().signIn(`staff@${DOMAIN}`, "wrong-password")).toEqual({ ok: false, error: "invalid_credentials" });
  });
});

describe("signed in, not staff", () => {
  it("isStaff is false, sees no reservations, and status updates are refused with data unchanged", async () => {
    const api = newApi();
    expect(await api.signIn(`customer@${DOMAIN}`, password)).toEqual({ ok: true });
    expect(await api.getSession()).toMatchObject({ email: `customer@${DOMAIN}` });
    expect(await api.isStaff()).toBe(false);
    expect(await api.listReservations(DATE)).toEqual([]);
    const err = await api.updateStatus(ids[`b@${DOMAIN}`], "confirmed").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AdminApiError);
    expect((err as AdminApiError).code).toBe("forbidden");
    expect(sql(`select status from public.reservations where email = 'b@${DOMAIN}'`)).toBe("pending");
  });
});

describe("staff", () => {
  it("isStaff is true and reads all reservations for the day (with slot time, sorted)", async () => {
    const api = newApi();
    expect(await api.signIn(`staff@${DOMAIN}`, password)).toEqual({ ok: true });
    expect(await api.isStaff()).toBe(true);
    const list = await api.listReservations(DATE);
    expect(list.map((x) => [x.startTime, x.name, x.status])).toEqual([
      ["08:00", "Early A", "confirmed"],
      ["10:00", "Late B", "pending"],
      ["10:00", "Late C", "cancelled"],
    ]);
    expect(list[0]).toMatchObject({ phone: "0900-000-000", partySize: 3, note: "window", date: DATE });
  });

  it("sees only the requested date", async () => {
    const api = newApi();
    await api.signIn(`staff@${DOMAIN}`, password);
    expect(await api.listReservations("2099-03-04")).toEqual([]);
  });

  it("can change status and it is saved to the database", async () => {
    const api = newApi();
    await api.signIn(`staff@${DOMAIN}`, password);
    await api.updateStatus(ids[`b@${DOMAIN}`], "confirmed");
    expect(sql(`select status from public.reservations where email = 'b@${DOMAIN}'`)).toBe("confirmed");
    const list = await api.listReservations(DATE);
    expect(list.find((x) => x.email === `b@${DOMAIN}`)?.status).toBe("confirmed");
  });

  it("unknown reservation id returns not_found", async () => {
    const api = newApi();
    await api.signIn(`staff@${DOMAIN}`, password);
    await expect(api.updateStatus("00000000-0000-0000-0000-000000000000", "confirmed")).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("after sign-out there is no session and no reservations can be read", async () => {
    const api = newApi();
    await api.signIn(`staff@${DOMAIN}`, password);
    await api.signOut();
    expect(await api.getSession()).toBeNull();
    await expect(api.listReservations(DATE)).rejects.toMatchObject({ code: "forbidden" });
  });
});
