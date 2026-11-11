import { execFileSync } from "node:child_process";

export function localSupabase(): { url: string; anonKey: string; serviceKey: string } {
  const out = execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8" });
  const get = (key: string) => out.match(new RegExp(`^${key}="(.*)"$`, "m"))?.[1] ?? "";
  const url = get("API_URL");
  const anonKey = get("ANON_KEY");
  const serviceKey = get("SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) throw new Error("Local Supabase is not running: run supabase start first");
  return { url, anonKey, serviceKey };
}
