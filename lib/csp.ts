import { createHash } from "node:crypto";

// 建置後處理(scripts/apply-csp.mts)用:Next 靜態輸出無法用 nonce,
// 改為逐頁計算 inline script 的 sha256,寫進該頁的 <meta> CSP。
// frame-ancestors 等 meta 不支援的 directive 放在 public/_headers。

const TURNSTILE = "https://challenges.cloudflare.com";
const OSM = "https://www.openstreetmap.org";
const META_PREFIX = '<meta http-equiv="Content-Security-Policy"';

const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const EXECUTABLE_TYPES = new Set(["", "text/javascript", "application/javascript", "module"]);

/** 頁面中會被瀏覽器執行的 inline script 內容(原樣,不解碼) */
export function inlineScripts(html: string): string[] {
  const scripts: string[] = [];
  for (const [, attrs, body] of html.matchAll(SCRIPT_RE)) {
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const type = attrs.match(/\btype\s*=\s*"([^"]*)"/i)?.[1].trim().toLowerCase() ?? "";
    if (EXECUTABLE_TYPES.has(type)) scripts.push(body);
  }
  return scripts;
}

export function scriptHash(script: string): string {
  return `'sha256-${createHash("sha256").update(script, "utf8").digest("base64")}'`;
}

function origin(url: string): string {
  const parsed = new URL(url); // 不是合法 URL 會丟錯
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error(`Supabase URL 必須是 http(s):${url}`);
  return parsed.origin;
}

export function buildCsp({ scriptHashes, supabaseUrl }: { scriptHashes: string[]; supabaseUrl: string }): string {
  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    ["script-src", ["'self'", ...new Set(scriptHashes), TURNSTILE]],
    // React 的 style 屬性與 Turnstile 需要 inline style;style 無法執行程式,風險遠低於 script
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:"]],
    ["font-src", ["'self'"]],
    ["connect-src", ["'self'", ...(supabaseUrl ? [origin(supabaseUrl)] : [])]],
    ["frame-src", [TURNSTILE, OSM]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
  ];
  return directives.map(([name, values]) => `${name} ${values.join(" ")}`).join("; ");
}

/** 在 <head> 的 charset 之後(所有 script 之前)插入該頁專屬的 CSP meta */
export function applyCsp(html: string, { supabaseUrl }: { supabaseUrl: string }): string {
  if (html.includes(META_PREFIX)) throw new Error("CSP meta already present");
  const head = html.match(/<head>(<meta charSet="utf-8"\/>)?/i);
  if (!head || head.index === undefined) throw new Error("找不到 <head>,無法插入 CSP");
  const policy = buildCsp({ scriptHashes: inlineScripts(html).map(scriptHash), supabaseUrl });
  const at = head.index + head[0].length;
  return `${html.slice(0, at)}${META_PREFIX} content="${policy}"/>${html.slice(at)}`;
}
