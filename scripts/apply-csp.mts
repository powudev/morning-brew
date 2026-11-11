import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { applyCsp } from "../lib/csp.ts";

const outDir = process.argv[2] ?? "out";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (!supabaseUrl) console.warn("[apply-csp] NEXT_PUBLIC_SUPABASE_URL is not set: connect-src allows 'self' only, so the staff dashboard cannot reach Supabase");

const files = readdirSync(outDir, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".html"));
if (files.length === 0) throw new Error(`[apply-csp] no HTML files in ${outDir}/, run next build first`);

for (const file of files) {
  const path = join(outDir, file);
  writeFileSync(path, applyCsp(readFileSync(path, "utf8"), { supabaseUrl }));
}
console.log(`[apply-csp] added CSP to ${files.length} HTML files`);
