import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { handleNotifyConfirmed } from "@/server/notify-confirmed";
import { sql } from "../e2e/support/db";
import { localSupabase } from "../e2e/support/local-supabase";

// Real local Supabase (Auth token check, staff lookup, atomic claim); only the email provider is faked.
const DOMAIN = "notify-integration.test";
const DATE = "2099-04-04";
const SLOT_ID = 980101;
const MAIL_URL = "http://mail.test/emails";
const password = randomBytes(12).toString("hex");
const { url, anonKey, serviceKey } = localSupabase();
const env = {
  NEXT_PUBLIC_SUPABASE_URL: url,
  SUPABASE_SERVICE_ROLE_KEY: serviceKey,
  RESEND_API_KEY: "re_test",
  EMAIL_FROM: "Demo <demo@powu.test>",
  EMAIL_API_URL: "http://mail.test",
};

let mailOk = true;
let mails: { to: string[]; subject: string }[] = [];
const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
  if (String(input) === MAIL_URL) {
    if (!mailOk) return new Response("{}", { status: 500 });
    mails.push(JSON.parse(init!.body as string));
    return new Response(JSON.stringify({ id: "e" }), { status: 200 });
  }
  return fetch(input, init);
}) as typeof fetch;

async function createUser(email: string): Promise<void> {
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!res.ok) throw new Error(`create user failed: ${res.status} ${await res.text()}`);
  const { id } = (await res.json()) as { id: string };
  if (email.startsWith("staff@")) sql(`insert into public.staff (user_id) values ('${id}')`);
}

async function tokenFor(email: string): Promise<string> {
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session.access_token;
}

function addReservation(label: string, status: "pending" | "confirmed"): string {
  return sql(`insert into public.reservations (slot_id, reservation_date, name, email, party_size, status)
              values (${SLOT_ID}, '${DATE}', 'Guest ${label}', '${label}@${DOMAIN}', 2, '${status}') returning id`);
}
const sentAt = (id: string) => sql(`select coalesce(confirmed_email_sent_at::text, 'null') from public.reservations where id = '${id}'`);

async function notify(id: string, token: string | null) {
  const res = await handleNotifyConfirmed(
    new Request("http://local.test/api/admin/notify-confirmed", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ id }),
    }),
    env,
    fetchImpl,
  );
  return { status: res.status, body: await res.json() };
}

function cleanup() {
  sql(`
    delete from public.reservations where email like '%@${DOMAIN}';
    delete from public.time_slots where id = ${SLOT_ID};
    delete from auth.users where email like '%@${DOMAIN}';
  `);
}

let staffToken = "";
let customerToken = "";

beforeAll(async () => {
  cleanup();
  sql(`insert into public.time_slots (id, slot_date, start_time, capacity) overriding system value
       values (${SLOT_ID}, '${DATE}', '09:45', 20)`);
  await createUser(`staff@${DOMAIN}`);
  await createUser(`customer@${DOMAIN}`);
  staffToken = await tokenFor(`staff@${DOMAIN}`);
  customerToken = await tokenFor(`customer@${DOMAIN}`);
});

afterAll(() => cleanup());

describe("notify-confirmed against local Supabase", () => {
  it("rejects a forged token (401) and a non-staff user (403) without writing anything", async () => {
    const id = addReservation("denied", "confirmed");
    mails = [];
    expect((await notify(id, "not-a-real-jwt")).status).toBe(401);
    expect((await notify(id, customerToken)).status).toBe(403);
    expect(sentAt(id)).toBe("null");
    expect(mails).toEqual([]);
  });

  it("a pending reservation is not emailed", async () => {
    const id = addReservation("pending", "pending");
    mails = [];
    expect(await notify(id, staffToken)).toEqual({ status: 200, body: { sent: false, reason: "NOTHING_TO_SEND" } });
    expect(sentAt(id)).toBe("null");
    expect(mails).toEqual([]);
  });

  it("staff + confirmed reservation: one email with the slot time; calling again sends nothing", async () => {
    const id = addReservation("confirmed", "confirmed");
    mails = [];
    expect(await notify(id, staffToken)).toEqual({ status: 200, body: { sent: true } });
    expect(sentAt(id)).not.toBe("null");
    expect(await notify(id, staffToken)).toEqual({ status: 200, body: { sent: false, reason: "NOTHING_TO_SEND" } });
    expect(mails).toHaveLength(1);
    expect(mails[0].to).toEqual([`confirmed@${DOMAIN}`]);
    expect(mails[0].subject).toMatch(/confirmed/);
    expect((mails[0] as unknown as { text: string }).text).toContain("09:45");
  });

  it("a failed send releases the claim so it can be retried", async () => {
    const id = addReservation("retry", "confirmed");
    mails = [];
    mailOk = false;
    expect((await notify(id, staffToken)).status).toBe(502);
    expect(sentAt(id)).toBe("null");
    mailOk = true;
    expect(await notify(id, staffToken)).toEqual({ status: 200, body: { sent: true } });
    expect(mails).toHaveLength(1);
  });
});
