import { randomBytes } from "node:crypto";
import { cleanup, CUSTOMER_EMAIL, seedFixtures, sql, STAFF_EMAIL } from "./db";
import { localSupabase } from "./local-supabase";

async function createUser(email: string, password: string): Promise<string> {
  const { url, serviceKey } = localSupabase();
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!res.ok) throw new Error(`create ${email} failed: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { id: string }).id;
}

export default async function globalSetup() {
  cleanup();
  seedFixtures();

  const password = randomBytes(12).toString("hex");
  const staffId = await createUser(STAFF_EMAIL, password);
  await createUser(CUSTOMER_EMAIL, password);
  sql(`insert into public.staff (user_id) values ('${staffId}');`);
  process.env.E2E_USER_PASSWORD = password;

  return () => cleanup();
}
