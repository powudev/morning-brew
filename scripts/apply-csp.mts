// next build 之後執行:替 out/ 每個 HTML 加上逐頁 CSP(inline script hash)。邏輯與測試在 lib/csp.ts。
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { applyCsp } from "../lib/csp.ts";

const outDir = process.argv[2] ?? "out";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (!supabaseUrl) console.warn("[apply-csp] 未設定 NEXT_PUBLIC_SUPABASE_URL:connect-src 只允許 self,後台將無法連線");

const files = readdirSync(outDir, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".html"));
if (files.length === 0) throw new Error(`[apply-csp] ${outDir}/ 沒有 HTML,請先 next build`);

for (const file of files) {
  const path = join(outDir, file);
  writeFileSync(path, applyCsp(readFileSync(path, "utf8"), { supabaseUrl }));
}
console.log(`[apply-csp] 已處理 ${files.length} 個 HTML`);
