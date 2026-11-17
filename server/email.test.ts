import { describe, expect, it, vi } from "vitest";
import { confirmedEmail, emailConfig, receivedEmail, sendEmail, type EmailDetails } from "@/server/email";

const details: EmailDetails = { name: "Demo Guest", date: "2099-03-03", startTime: "08:30", partySize: 2 };

describe("emailConfig", () => {
  it("is null (email disabled) unless both the API key and sender are set", () => {
    expect(emailConfig({})).toBeNull();
    expect(emailConfig({ RESEND_API_KEY: "re_x" })).toBeNull();
    expect(emailConfig({ EMAIL_FROM: "Demo <a@b.test>" })).toBeNull();
    expect(emailConfig({ RESEND_API_KEY: "", EMAIL_FROM: "Demo <a@b.test>" })).toBeNull();
  });

  it("defaults to the Resend API and allows a base URL override (tests)", () => {
    expect(emailConfig({ RESEND_API_KEY: "re_x", EMAIL_FROM: "Demo <a@b.test>" })).toEqual({
      apiKey: "re_x",
      from: "Demo <a@b.test>",
      apiUrl: "https://api.resend.com",
    });
    expect(
      emailConfig({ RESEND_API_KEY: "re_x", EMAIL_FROM: "Demo <a@b.test>", EMAIL_API_URL: "http://localhost:9/" })?.apiUrl,
    ).toBe("http://localhost:9");
  });
});

describe("email templates", () => {
  it("received: says the request is pending (not confirmed), in English and Traditional Chinese", () => {
    const m = receivedEmail(details);
    expect(m.subject).toBe("Reservation request received · 已收到訂位申請 – Morning Brew (demo)");
    for (const body of [m.text, m.html]) {
      expect(body).toContain("Tuesday 3 March 2099");
      expect(body).toContain("2099年3月3日");
      expect(body).toContain("08:30");
      expect(body).toMatch(/2 guests/);
      expect(body).toContain("2 位");
      expect(body).toMatch(/not confirmed yet/);
      expect(body).toContain("尚未確認");
      expect(body).not.toMatch(/is confirmed/);
    }
  });

  it("received: never echoes the guest's free-text name (anyone can trigger it for any address)", () => {
    const m = receivedEmail({ ...details, name: "Visit evil.example now" });
    for (const body of [m.text, m.html]) {
      expect(body).not.toContain("evil.example");
      expect(body).toMatch(/^(Hello|<!doctype)/);
    }
  });

  it("confirmed: greets by name with line breaks and control characters flattened", () => {
    const m = confirmedEmail({ ...details, name: "Demo\r\n\nGuest\u0000 \t Two" });
    expect(m.text).toContain("Hi Demo Guest Two,");
    expect(m.html).toContain("Hi Demo Guest Two,");
  });

  it("confirmed: says the reservation is confirmed", () => {
    const m = confirmedEmail({ ...details, partySize: 1 });
    expect(m.subject).toBe("Reservation confirmed · 訂位已確認 – Morning Brew (demo)");
    for (const body of [m.text, m.html]) {
      expect(body).toMatch(/is confirmed/);
      expect(body).toContain("已確認");
      expect(body).toMatch(/1 guest\b/);
    }
  });

  it("both carry the demo / fictional business notice in both languages", () => {
    for (const m of [receivedEmail(details), confirmedEmail(details)]) {
      for (const body of [m.text, m.html]) {
        expect(body).toContain("Demo project / fictional business");
        expect(body).toContain("示範專案／虛構店家");
        expect(body).toMatch(/didn.t make this request/);
      }
    }
  });

  it("escapes user input in HTML and keeps it out of the subject", () => {
    const evil = { ...details, name: `<img src=x onerror="alert(1)"> & "Bob"` };
    for (const m of [confirmedEmail(evil)]) {
      expect(m.html).not.toContain("<img");
      expect(m.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &quot;Bob&quot;");
      expect(m.subject).not.toContain("img");
      expect(m.subject).not.toContain("Bob");
    }
  });
});

describe("sendEmail", () => {
  const config = { apiKey: "re_test", from: "Morning Brew Demo <demo@powu.test>", apiUrl: "http://mail.test" };
  const message = { to: "guest@example.com", subject: "S", text: "T", html: "<p>H</p>", idempotencyKey: "received/abc" };

  it("posts to {apiUrl}/emails with bearer auth, JSON body and an idempotency key", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ id: "e1" }), { status: 200 }));
    await sendEmail(config, message, fetch);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://mail.test/emails");
    const headers = new Headers(init.headers);
    expect(headers.get("authorization")).toBe("Bearer re_test");
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("idempotency-key")).toBe("received/abc");
    expect(JSON.parse(init.body as string)).toEqual({
      from: "Morning Brew Demo <demo@powu.test>",
      to: ["guest@example.com"],
      subject: "S",
      text: "T",
      html: "<p>H</p>",
    });
  });

  it("throws on a non-2xx response", async () => {
    const fetch = vi.fn(async () => new Response("{}", { status: 422 }));
    await expect(sendEmail(config, message, fetch)).rejects.toThrow(/422/);
  });
});
