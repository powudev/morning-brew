import { createHash } from "node:crypto";

// Static export can't use nonces, so each page gets a CSP with the sha256 of its inline scripts.
// frame-ancestors can't be set in a <meta> CSP; it lives in public/_headers.
const TURNSTILE = "https://challenges.cloudflare.com";
const OSM = "https://www.openstreetmap.org";
const META_PREFIX = '<meta http-equiv="Content-Security-Policy"';

const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const EXECUTABLE_TYPES = new Set(["", "text/javascript", "application/javascript", "module"]);

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
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error(`Supabase URL 必須是 http(s):${url}`);
  return parsed.origin;
}

export function buildCsp({ scriptHashes, supabaseUrl }: { scriptHashes: string[]; supabaseUrl: string }): string {
  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    ["script-src", ["'self'", ...new Set(scriptHashes), TURNSTILE]],
    // Inline styles are allowed (React style props, Turnstile); scripts are not.
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

export function applyCsp(html: string, { supabaseUrl }: { supabaseUrl: string }): string {
  if (html.includes(META_PREFIX)) throw new Error("CSP meta already present");
  const head = html.match(/<head>(<meta charSet="utf-8"\/>)?/i);
  if (!head || head.index === undefined) throw new Error("找不到 <head>,無法插入 CSP");
  const policy = buildCsp({ scriptHashes: inlineScripts(html).map(scriptHash), supabaseUrl });
  const at = head.index + head[0].length;
  return `${html.slice(0, at)}${META_PREFIX} content="${policy}"/>${html.slice(at)}`;
}
