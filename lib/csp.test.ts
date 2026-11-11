import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { applyCsp, buildCsp, inlineScripts, scriptHash } from "@/lib/csp";

const sha = (s: string) => `'sha256-${createHash("sha256").update(s, "utf8").digest("base64")}'`;

const page = (body: string) =>
  `<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/><title>t</title></head><body>${body}</body></html>`;

describe("inlineScripts", () => {
  it("extracts executable inline scripts, skipping external files and JSON data", () => {
    const html = page(
      [
        `<script src="/_next/static/a.js" async=""></script>`,
        `<script>self.__next_f=[]</script>`,
        `<script id="_R_">(globalThis.X||[]).push(1)</script>`,
        `<script type="module">import "/x.js"</script>`,
        `<script type="application/ld+json">{"@type":"CafeOrCoffeeShop"}</script>`,
        `<script type="application/json">{}</script>`,
      ].join(""),
    );
    expect(inlineScripts(html)).toEqual([
      "self.__next_f=[]",
      "(globalThis.X||[]).push(1)",
      'import "/x.js"',
    ]);
  });

  it("keeps script content verbatim (newlines and escapes) so hashes match", () => {
    const body = 'self.__next_f.push([1,"a\\u003c/script\\u003e\\n"])\n';
    expect(inlineScripts(page(`<script>${body}</script>`))).toEqual([body]);
  });
});

describe("scriptHash", () => {
  it("uses the CSP sha256 source format", () => {
    expect(scriptHash("alert(1)")).toBe(sha("alert(1)"));
    expect(scriptHash("中文")).toBe(sha("中文"));
  });
});

describe("buildCsp", () => {
  it("script-src has only self, page hashes and Turnstile, no unsafe-inline / unsafe-eval", () => {
    const policy = buildCsp({ scriptHashes: ["'sha256-AAA='"], supabaseUrl: "https://abc.supabase.co" });
    const directives = Object.fromEntries(
      policy.split("; ").map((d) => {
        const [name, ...values] = d.split(" ");
        return [name, values];
      }),
    );
    expect(directives["default-src"]).toEqual(["'self'"]);
    expect(directives["script-src"]).toEqual(["'self'", "'sha256-AAA='", "https://challenges.cloudflare.com"]);
    expect(directives["connect-src"]).toEqual(["'self'", "https://abc.supabase.co"]);
    expect(directives["frame-src"]).toEqual(["https://challenges.cloudflare.com", "https://www.openstreetmap.org"]);
    expect(directives["object-src"]).toEqual(["'none'"]);
    expect(directives["base-uri"]).toEqual(["'self'"]);
    expect(directives["form-action"]).toEqual(["'self'"]);
    expect(policy).not.toMatch(/unsafe-eval/);
    expect(directives["script-src"]).not.toContain("'unsafe-inline'");
  });

  it("deduplicates hashes", () => {
    const policy = buildCsp({ scriptHashes: ["'sha256-A='", "'sha256-A='"], supabaseUrl: "" });
    expect(policy).toContain("script-src 'self' 'sha256-A=' https://challenges.cloudflare.com;");
  });

  it("connect-src allows only self without a Supabase URL", () => {
    expect(buildCsp({ scriptHashes: [], supabaseUrl: "" })).toContain("connect-src 'self';");
  });

  it("uses only the Supabase origin and rejects non-http(s) values", () => {
    expect(buildCsp({ scriptHashes: [], supabaseUrl: "https://abc.supabase.co/rest/v1" })).toContain(
      "connect-src 'self' https://abc.supabase.co;",
    );
    expect(() => buildCsp({ scriptHashes: [], supabaseUrl: "javascript:alert(1)" })).toThrow();
    expect(() => buildCsp({ scriptHashes: [], supabaseUrl: "not a url" })).toThrow();
  });
});

describe("applyCsp", () => {
  const html = page(`<script>a()</script><script src="/b.js"></script><script>c()</script>`);

  it("inserts the CSP meta at the top of <head>, before any script, with every inline script hash", () => {
    const out = applyCsp(html, { supabaseUrl: "" });
    const meta = out.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"\/>/);
    expect(meta).not.toBeNull();
    // nosemgrep: javascript.lang.security.audit.unknown-value-with-script-tag.unknown-value-with-script-tag -- test fixture string
    expect(out.indexOf(meta![0])).toBeLessThan(out.indexOf("<script"));
    expect(out.indexOf(meta![0])).toBe(out.indexOf("<head>") + "<head>".length + '<meta charSet="utf-8"/>'.length);
    expect(meta![1]).toContain(`${sha("a()")} ${sha("c()")}`);
  });

  it("leaves the rest of the page unchanged", () => {
    const out = applyCsp(html, { supabaseUrl: "" });
    expect(out.replace(/<meta http-equiv="Content-Security-Policy" content="[^"]+"\/>/, "")).toBe(html);
  });

  it("refuses to process a page that already has a CSP meta", () => {
    const once = applyCsp(html, { supabaseUrl: "" });
    expect(() => applyCsp(once, { supabaseUrl: "" })).toThrow(/already/);
  });

  it("throws when <head> is missing instead of emitting a page without CSP", () => {
    expect(() => applyCsp("<html><body></body></html>", { supabaseUrl: "" })).toThrow(/<head>/);
  });
});
