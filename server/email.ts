/**
 * Transactional email (reservation received / confirmed) through the Resend HTTP API.
 * Optional: when RESEND_API_KEY or EMAIL_FROM is missing, email is simply off and bookings work as before.
 */

export type EmailEnv = { RESEND_API_KEY?: string; EMAIL_FROM?: string; EMAIL_API_URL?: string };
export type EmailConfig = { apiKey: string; from: string; apiUrl: string };
export type EmailDetails = { name: string; date: string; startTime: string; partySize: number };
export type EmailContent = { subject: string; text: string; html: string };
export type EmailMessage = EmailContent & { to: string; idempotencyKey: string };

const RESEND_API_URL = "https://api.resend.com";

export function emailConfig(env: EmailEnv): EmailConfig | null {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return null;
  return {
    apiKey: env.RESEND_API_KEY,
    from: env.EMAIL_FROM,
    apiUrl: (env.EMAIL_API_URL || RESEND_API_URL).replace(/\/+$/, ""),
  };
}

export async function sendEmail(config: EmailConfig, message: EmailMessage, fetchImpl: typeof fetch): Promise<void> {
  const res = await fetchImpl(`${config.apiUrl}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      // Resend drops a repeat with the same key, so a retried request can't email twice.
      "Idempotency-Key": message.idempotencyKey,
    },
    body: JSON.stringify({
      from: config.from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });
  if (!res.ok) throw new Error(`email provider responded ${res.status}`);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Fixed tables instead of Intl: ICU output differs between Node and the Workers runtime.
const EN_WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const EN_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const ZH_WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function dateParts(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), day: d.getUTCDate(), wd: d.getUTCDay() };
}
const enDate = (iso: string) => {
  const p = dateParts(iso);
  return `${EN_WEEKDAYS[p.wd]} ${p.day} ${EN_MONTHS[p.m]} ${p.y}`;
};
const zhDate = (iso: string) => {
  const p = dateParts(iso);
  return `${p.y}年${p.m + 1}月${p.day}日（週${ZH_WEEKDAYS[p.wd]}）`;
};
const enGuests = (n: number) => `${n} ${n === 1 ? "guest" : "guests"}`;

type Kind = "received" | "confirmed";

const copy = {
  received: {
    subject: "Reservation request received · 已收到訂位申請",
    enHeading: "We received your reservation request.",
    enStatus: "It is not confirmed yet. We'll email you again once the café confirms it.",
    zhHeading: "我們已收到您的訂位申請。",
    zhStatus: "訂位尚未確認，店家確認後會再寄信通知您。",
  },
  confirmed: {
    subject: "Reservation confirmed · 訂位已確認",
    enHeading: "Good news: your reservation is confirmed.",
    enStatus: "We look forward to seeing you.",
    zhHeading: "好消息：您的訂位已確認。",
    zhStatus: "期待您的光臨。",
  },
} as const;

const DEMO_EN =
  "Demo project / fictional business: Morning Brew is not a real café, and no table is actually held. " +
  "If you didn't make this request, you can ignore this email.";
const DEMO_ZH = "示範專案／虛構店家：Morning Brew 並非真實咖啡店，也不會真的保留座位。若您沒有提出這個申請，請忽略本信。";

function build(kind: Kind, d: EmailDetails): EmailContent {
  const c = copy[kind];
  const subject = `${c.subject} – Morning Brew (demo)`;

  const text = [
    `Hi ${d.name},`,
    "",
    c.enHeading,
    `Date: ${enDate(d.date)}`,
    `Time: ${d.startTime}`,
    `Party: ${enGuests(d.partySize)}`,
    c.enStatus,
    "",
    "———",
    "",
    `${d.name} 您好：`,
    "",
    c.zhHeading,
    `日期：${zhDate(d.date)}`,
    `時間：${d.startTime}`,
    `人數：${d.partySize} 位`,
    c.zhStatus,
    "",
    "———",
    DEMO_EN,
    DEMO_ZH,
  ].join("\n");

  const name = escapeHtml(d.name);
  const row = (label: string, value: string) =>
    `<tr><td style="padding:2px 12px 2px 0;color:#555">${label}</td><td style="padding:2px 0"><strong>${value}</strong></td></tr>`;
  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f7f1e8;font-family:Arial,'Noto Sans TC',sans-serif;color:#2b1d14">
<div style="max-width:560px;margin:0 auto;background:#fffdf9;border-radius:12px;padding:24px">
<h1 style="font-size:20px;margin:0 0 16px">Morning Brew (demo)</h1>
<div lang="en">
<p>Hi ${name},</p>
<p>${c.enHeading}</p>
<table role="presentation">${row("Date", enDate(d.date))}${row("Time", d.startTime)}${row("Party", enGuests(d.partySize))}</table>
<p>${c.enStatus}</p>
</div>
<hr style="border:0;border-top:1px solid #e5d9c8;margin:20px 0">
<div lang="zh-Hant-TW">
<p>${name} 您好：</p>
<p>${c.zhHeading}</p>
<table role="presentation">${row("日期", zhDate(d.date))}${row("時間", d.startTime)}${row("人數", `${d.partySize} 位`)}</table>
<p>${c.zhStatus}</p>
</div>
<hr style="border:0;border-top:1px solid #e5d9c8;margin:20px 0">
<p style="font-size:12px;color:#666">${DEMO_EN}</p>
<p style="font-size:12px;color:#666" lang="zh-Hant-TW">${DEMO_ZH}</p>
</div>
</body></html>`;

  return { subject, text, html };
}

export const receivedEmail = (d: EmailDetails) => build("received", d);
export const confirmedEmail = (d: EmailDetails) => build("confirmed", d);
