// Stand-in for the Resend API during E2E: stores what the Pages Functions send so tests can read it back.
import { createServer } from "node:http";

const port = Number(process.env.MAIL_PORT ?? 8795);
const apiKey = process.env.MAIL_API_KEY ?? "re_e2e";
/** @type {{ to: string[]; subject: string; text: string; html: string; idempotencyKey: string | undefined }[]} */
const sent = [];

createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);
  const reply = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };

  if (req.method === "POST" && url.pathname === "/emails") {
    if (req.headers.authorization !== `Bearer ${apiKey}`) return reply(401, { message: "bad key" });
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      const key = req.headers["idempotency-key"];
      const idempotencyKey = Array.isArray(key) ? key[0] : key;
      // Like Resend: a repeated idempotency key is accepted but not sent again.
      if (!idempotencyKey || !sent.some((m) => m.idempotencyKey === idempotencyKey)) {
        sent.push({ ...JSON.parse(raw), idempotencyKey });
      }
      reply(200, { id: `e2e-${sent.length}` });
    });
    return;
  }
  if (req.method === "GET" && url.pathname === "/emails") {
    const to = url.searchParams.get("to");
    return reply(200, to ? sent.filter((m) => m.to.includes(to)) : sent);
  }
  if (req.method === "GET" && url.pathname === "/") return reply(200, { ok: true });
  reply(404, {});
}).listen(port, "localhost");
